// Ali Karam POS System - Enhanced Authentication & Security
// Compatible with Windows 7+ browsers and works fully offline
// Includes one-time license activation system

// Ali Karam POS System - Enhanced Authentication & Security
// Compatible with Windows 7+ browsers and works fully offline
// Includes one-time license activation system

// Enhanced Security System
var EnhancedSecurity = {
    // Encryption settings
    encryptionKey: 'AliKaram@2025!POS#Security$Enhanced&',

    // Simple encryption for demo (use stronger encryption in production)
encrypt: function(text) {
  if (!text) return '';
  var result = '';
  for (var i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
    );
  }
  return btoa(unescape(encodeURIComponent(result))); // ✅ Unicode-safe
},

decrypt: function(encryptedText) {
  if (!encryptedText) return '';
  try {
    var text = decodeURIComponent(escape(atob(encryptedText))); // ✅ Unicode-safe
    var result = '';
    for (var i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }
    return result;
  } catch (e) {
    return '';
  }
}
,

    // Store encrypted data
    storeSecureData: function(key, data) {
        try {
            var encryptedData = this.encrypt(JSON.stringify(data));
            localStorage.setItem('pos_secure_' + key, encryptedData);
            return true;
        } catch (e) {
            console.error('Failed to store secure data:', e);
            return false;
        }
    },

    // Get encrypted data
    getSecureData: function(key) {
        try {
            var encryptedData = localStorage.getItem('pos_secure_' + key);
            if (!encryptedData) return null;

            var decryptedData = this.decrypt(encryptedData);
            if (!decryptedData) return null;

            return JSON.parse(decryptedData);
        } catch (e) {
            console.error('Failed to get secure data:', e);
            return null;
        }
    },

    // Generate unique system fingerprint
    generateSystemFingerprint: function() {
        var fingerprint = '';
        fingerprint += navigator.userAgent;
        fingerprint += navigator.language;
        fingerprint += screen.width + 'x' + screen.height;

        var hash = 0;
        for (var i = 0; i < fingerprint.length; i++) {
            var char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return 'FP' + Math.abs(hash).toString(16).toUpperCase();
    },

    // Generate license key from fingerprint
generateLicense: function(realFingerprint) {
    var hash = 0;
    for (var i = 0; i < realFingerprint.length; i++) {
        hash = ((hash << 5) - hash) + realFingerprint.charCodeAt(i);
        hash |= 0;
    }
    return 'LIC-' + Math.abs(hash).toString(36).toUpperCase();
},
verifyLicense: function(licenseKey, realFingerprint) {
    return licenseKey === this.generateLicense(realFingerprint);
},

    // Activate license (one-time only)
activateLicenseWithFingerprint: function(licenseKey, businessName, fingerprint) {
    var existingLicense = this.getLicenseData();
    if (existingLicense && existingLicense.activated) {
        return {
            success: false,
            error: 'System is already activated.'
        };
    }

    if (!this.verifyLicense(licenseKey, fingerprint)) {
        return {
            success: false,
            error: 'Invalid license key for this machine.'
        };
    }

    if (!businessName || businessName.length < 2) {
        return {
            success: false,
            error: 'Please enter a valid business name.'
        };
    }

    const activationData = {
        licenseKey: licenseKey,
        businessName: businessName,
        activated: true,
        activatedDate: new Date().toISOString(),
        systemFingerprint: fingerprint
    };

    const stored = this.storeSecureData('license', activationData);
   if (stored) {
    localStorage.setItem("pos_license", JSON.stringify({
        business: businessName,
        activatedAt: new Date().toISOString()
    }));

    initializeDefaultData();
    return { success: true, data: activationData };
}else {
        return {
            success: false,
            error: 'Failed to activate license. Try again.'
        };
    }
},
    // Get license data
    getLicenseData: function() {
        return this.getSecureData('license');
    },

    // Check if system is activated
    isSystemActivated: function() {
        var licenseData = this.getLicenseData();
        return licenseData && licenseData.activated === true;
    }
};

// Default users with enhanced encryption
var defaultUsers = [
    {
        id: 1,
        username: 'admin',
        passwordHash: 'admin123hash', // Will be encrypted after activation
        role: 'admin',
        fullName: 'System Administrator',
        active: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        username: 'manager',
        passwordHash: 'manager123hash',
        role: 'manager',
        fullName: 'Store Manager',
        active: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 3,
        username: 'cashier',
        passwordHash: 'cashier123hash',
        role: 'cashier',
        fullName: 'Cashier User',
        active: true,
        createdAt: new Date().toISOString()
    }
];

// Enhanced password hashing
function hashPassword(password) {
    if (EnhancedSecurity.isSystemActivated()) {
        return EnhancedSecurity.encrypt(password);
    }
    return password + 'hash'; // Fallback for compatibility
}

// Enhanced password verification
function verifyPassword(password, hash) {
    if (EnhancedSecurity.isSystemActivated()) {
        var decrypted = EnhancedSecurity.decrypt(hash);
        return decrypted === password;
    }
    return hash === password + 'hash'; // Fallback
}

// Initialize users with enhanced security
function initializeUsers() {
    if (EnhancedSecurity.isSystemActivated()) {
        var existingUsers = EnhancedSecurity.getSecureData('users');
        if (!existingUsers || existingUsers.length === 0) {
            initializeDefaultData();
        }
    } else {
        var existingUsers = getUsers();
        if (existingUsers.length === 0) {
            localStorage.setItem('pos_users', JSON.stringify(defaultUsers));
        }
    }
}

// Initialize default data after activation
function initializeDefaultData() {
    // Enhanced users with encrypted passwords
    var enhancedUsers = [
        {
            id: 1,
            username: 'admin',
            passwordHash: EnhancedSecurity.encrypt('admin123'),
            role: 'admin',
            fullName: 'System Administrator',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            username: 'manager',
            passwordHash: EnhancedSecurity.encrypt('manager123'),
            role: 'manager',
            fullName: 'Store Manager',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            username: 'cashier',
            passwordHash: EnhancedSecurity.encrypt('cashier123'),
            role: 'cashier',
            fullName: 'Cashier User',
            active: true,
            createdAt: new Date().toISOString()
        }
    ];

    EnhancedSecurity.storeSecureData('users', enhancedUsers);

    // Default products
    var defaultProducts = [
        { 
            id: 1, 
            name: 'كوكا كولا 330مل', 
            nameEn: 'Coca Cola 330ml',
            barcode: '1234567890123', 
            price: 25.50, 
            stock: 100, 
            minStock: 10,
            category: 'مشروبات',
            categoryEn: 'Beverages'
        },
        { 
            id: 2, 
            name: 'تيشيرت أبيض مقاس وسط', 
            nameEn: 'White T-Shirt Medium',
            barcode: '2345678901234', 
            price: 299.99, 
            stock: 25, 
            minStock: 5,
            category: 'ملابس',
            categoryEn: 'Clothing'
        },
        { 
            id: 3, 
            name: 'كراسة A4', 
            nameEn: 'Notebook A4',
            barcode: '3456789012345', 
            price: 65.25, 
            stock: 50, 
            minStock: 10,
            category: 'مكتبية',
            categoryEn: 'Stationery'
        },
        { 
            id: 4, 
            name: 'كوب قهوة', 
            nameEn: 'Coffee Mug',
            barcode: '4567890123456', 
            price: 179.99, 
            stock: 30, 
            minStock: 5,
            category: 'منزلية',
            categoryEn: 'Home'
        },
        { 
            id: 5, 
            name: 'ماوس لاسلكي', 
            nameEn: 'Wireless Mouse',
            barcode: '5678901234567', 
            price: 510.50, 
            stock: 15, 
            minStock: 3,
            category: 'إلكترونيات',
            categoryEn: 'Electronics'
        }
    ];

    EnhancedSecurity.storeSecureData('products', defaultProducts);
    EnhancedSecurity.storeSecureData('sales', []);
    EnhancedSecurity.storeSecureData('returns', []);
}

// Get all users (enhanced version)
function getUsers() {
    if (EnhancedSecurity.isSystemActivated()) {
        return EnhancedSecurity.getSecureData('users') || [];
    } else {
        var users = localStorage.getItem('pos_users');
        return users ? JSON.parse(users) : [];
    }
}

// Save users (enhanced version)
function saveUsers(users) {
    if (EnhancedSecurity.isSystemActivated()) {
        return EnhancedSecurity.storeSecureData('users', users);
    } else {
        localStorage.setItem('pos_users', JSON.stringify(users));
        return true;
    }
}

// Get current logged in user
function getCurrentUser() {
    var user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// Enhanced login function
function login(username, password) {
    // Check if system is activated
    if (!EnhancedSecurity.isSystemActivated()) {
        console.error('System not activated');
        return false;
    }

    initializeUsers();
    var users = getUsers();
    
    var user = null;
    for (var i = 0; i < users.length; i++) {
        if (users[i].username === username && users[i].active === true) {
            if (verifyPassword(password, users[i].passwordHash)) {
                user = users[i];
                break;
            }
        }
    }
    
    if (user) {
        var sessionUser = {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.fullName,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('currentUser', JSON.stringify(sessionUser));
        return true;
    }
    
    return false;
}

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
}

// Check if user has permission based on role hierarchy
function hasPermission(requiredRole) {
    var currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    var roleHierarchy = {
        'admin': 3,
        'manager': 2,
        'cashier': 1
    };
    
    var userLevel = roleHierarchy[currentUser.role] || 0;
    var requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
}

// Specific permission checks
function canEditProducts() {
    return hasPermission('manager');
}

function canManageUsers() {
    return hasPermission('admin');
}

function canProcessReturns() {
    return hasPermission('manager');
}

function canViewReports() {
    return hasPermission('cashier');
}

function canDeleteSales() {
    return hasPermission('admin');
}

// Enhanced add user function
function addUser(userData) {
    if (!canManageUsers()) {
        throw new Error('Permission denied - Admin access required');
    }
    
    var users = getUsers();
    
    for (var i = 0; i < users.length; i++) {
        if (users[i].username === userData.username && users[i].active) {
            throw new Error('Username already exists');
        }
    }
    
    if (!userData.username || !userData.password || !userData.role || !userData.fullName) {
        throw new Error('All fields are required');
    }
    
    var newUser = {
        id: Date.now(),
        username: userData.username,
        passwordHash: hashPassword(userData.password),
        role: userData.role,
        fullName: userData.fullName,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: getCurrentUser().username
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return newUser;
}

// Enhanced edit user function
function editUser(userId, userData) {
    if (!canManageUsers()) {
        throw new Error('Permission denied - Admin access required');
    }
    
    var users = getUsers();
    var userIndex = -1;
    
    for (var i = 0; i < users.length; i++) {
        if (users[i].id === userId) {
            userIndex = i;
            break;
        }
    }
    
    if (userIndex === -1) {
        throw new Error('User not found');
    }
    
    for (var j = 0; j < users.length; j++) {
        if (users[j].username === userData.username && 
            users[j].id !== userId && 
            users[j].active) {
            throw new Error('Username already exists');
        }
    }
    
    users[userIndex].username = userData.username;
    users[userIndex].fullName = userData.fullName;
    users[userIndex].role = userData.role;
    
    if (userData.password && userData.password.trim() !== '') {
        users[userIndex].passwordHash = hashPassword(userData.password);
    }
    
    users[userIndex].updatedAt = new Date().toISOString();
    users[userIndex].updatedBy = getCurrentUser().username;
    
    saveUsers(users);
    return users[userIndex];
}

// Delete user function
function deleteUser(userId) {
    if (!canManageUsers()) {
        throw new Error('Permission denied - Admin access required');
    }
    
    var currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        throw new Error('Cannot delete your own account');
    }
    
    var users = getUsers();
    var userIndex = -1;
    
    for (var i = 0; i < users.length; i++) {
        if (users[i].id === userId) {
            userIndex = i;
            break;
        }
    }
    
    if (userIndex === -1) {
        throw new Error('User not found');
    }
    
    var adminCount = 0;
    for (var k = 0; k < users.length; k++) {
        if (users[k].role === 'admin' && users[k].active) {
            adminCount++;
        }
    }
    
    if (users[userIndex].role === 'admin' && adminCount <= 1) {
        throw new Error('Cannot delete the last admin user');
    }
    
    users[userIndex].active = false;
    users[userIndex].deletedAt = new Date().toISOString();
    users[userIndex].deletedBy = currentUser.username;
    
    saveUsers(users);
    return true;
}

// Get active users only
function getActiveUsers() {
    var users = getUsers();
    var activeUsers = [];
    
    for (var i = 0; i < users.length; i++) {
        if (users[i].active === true) {
            var safeUser = {
                id: users[i].id,
                username: users[i].username,
                role: users[i].role,
                fullName: users[i].fullName,
                createdAt: users[i].createdAt,
                updatedAt: users[i].updatedAt
            };
            activeUsers.push(safeUser);
        }
    }
    
    return activeUsers;
}

// Change password function
function changePassword(currentPassword, newPassword, confirmPassword) {
    var currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('Not logged in');
    }
    
    if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
    }
    
    if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }
    
    var users = getUsers();
    var user = null;
    
    for (var i = 0; i < users.length; i++) {
        if (users[i].id === currentUser.id) {
            user = users[i];
            break;
        }
    }
    
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
        throw new Error('Current password is incorrect');
    }
    
    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    
    saveUsers(users);
    return true;
}

// Check if user session is valid
function isSessionValid() {
    // First check if system is activated
    if (!EnhancedSecurity.isSystemActivated()) {
        return false;
    }
    
    var currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
        if (users[i].id === currentUser.id && users[i].active === true) {
            return true;
        }
    }
    
    logout();
    return false;
}

// Get user activity log
function getUserActivity() {
    var currentUser = getCurrentUser();
    return {
        username: currentUser ? currentUser.username : 'Guest',
        role: currentUser ? currentUser.role : 'None',
        loginTime: currentUser ? currentUser.loginTime : null,
        sessionDuration: currentUser ? 
            Math.floor((new Date() - new Date(currentUser.loginTime)) / 1000 / 60) + ' minutes' : 
            'Not logged in'
    };
}

// Initialize on page load - compatible with older browsers
if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function() {
        initializeUsers();
    });
} else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', function() {
        if (document.readyState === 'complete') {
            initializeUsers();
        }
    });
}

// Ensure default admin user exists after activation
function ensureDefaultAdmin() {
  if (!EnhancedSecurity.isSystemActivated()) return;

  const users = getUsers();
  const hasAdmin = users.some(u => u.username === 'admin' && u.active);
  if (!hasAdmin) {
    users.push({
      id: Date.now(),
      username: 'admin',
      passwordHash: EnhancedSecurity.encrypt('admin123'),
      role: 'admin',
      fullName: 'System Administrator',
      active: true,
      createdAt: new Date().toISOString()
    });
    saveUsers(users);
  }
}
ensureDefaultAdmin();


// Export functions for global use
window.EnhancedSecurity = EnhancedSecurity;
window.login = login;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.hasPermission = hasPermission;
window.canEditProducts = canEditProducts;
window.canManageUsers = canManageUsers;
window.canProcessReturns = canProcessReturns;
window.canViewReports = canViewReports;
window.canDeleteSales = canDeleteSales;
window.getActiveUsers = getActiveUsers;
window.addUser = addUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.changePassword = changePassword;
window.isSessionValid = isSessionValid;
window.getUserActivity = getUserActivity;
