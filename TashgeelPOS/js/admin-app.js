// admin-app.js

document.addEventListener('DOMContentLoaded', () => {
  // === Shop Settings ===
  const shopNameInput = document.getElementById('shop-name');
  const shopAddressInput = document.getElementById('shop-address');
  const shopLogoInput = document.getElementById('shop-logo');
  const logoPreview = document.getElementById('logo-preview');
  const shopForm = document.getElementById('shop-settings-form');
  const footerMessageInput = document.getElementById('footer-message');

  let uploadedLogoBase64 = '';
  const savedName = localStorage.getItem('shopName');
  const savedAddress = localStorage.getItem('shopAddress');
  const savedLogo = localStorage.getItem('shopLogo');
  const savedFooter = localStorage.getItem('footerMessage');

  if (savedName) shopNameInput.value = savedName;
  if (savedAddress) shopAddressInput.value = savedAddress;
  if (savedLogo) {
    logoPreview.src = savedLogo;
    logoPreview.style.display = 'block';
    uploadedLogoBase64 = savedLogo;
  }
  if (savedFooter) footerMessageInput.value = savedFooter;

  shopLogoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        uploadedLogoBase64 = reader.result;
        logoPreview.src = uploadedLogoBase64;
        logoPreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  shopForm.addEventListener('submit', (e) => {
    e.preventDefault();
    localStorage.setItem('shopName', shopNameInput.value.trim());
    localStorage.setItem('shopAddress', shopAddressInput.value.trim());
    localStorage.setItem('footerMessage', footerMessageInput.value.trim());
    if (uploadedLogoBase64.startsWith('data:image')) {
      localStorage.setItem('shopLogo', uploadedLogoBase64);
    }
    alert(getTranslation('settings_saved'));
  });

  // === User Management ===
  const userForm = document.getElementById('user-form');
  const usernameInput = document.getElementById('new-username');
  const passwordInput = document.getElementById('new-password');
  const roleSelect = document.getElementById('user-role');
  const userTableBody = document.getElementById('user-table-body');

  function loadUsers() {
    const users = getActiveUsers();
    userTableBody.innerHTML = '';
    users.forEach((user) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.role}</td>
        <td><button onclick="handleDeleteUser(${user.id})" class="btn btn-danger">🗑️</button></td>
      `;
      userTableBody.appendChild(row);
    });
  }

  window.handleDeleteUser = function(id) {
    try {
      const confirmed = confirm("Are you sure you want to delete this user?");
      if (!confirmed) return;
      deleteUser(id);
      loadUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  userForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleSelect.value;

    if (!username || !password) return alert('Fill all fields');

    try {
      addUser({
        username,
        password,
        role,
        fullName: username
      });
      alert('User created successfully');
      userForm.reset();
      loadUsers();
    } catch (e) {
      alert(e.message);
    }
  });

  loadUsers();
  applyTranslations();
});

// === Translations ===
function getTranslation(key) {
  const translations = {
    settings_saved: {
      en: 'Settings saved successfully!',
      ar: 'تم حفظ الإعدادات بنجاح'
    }
  };
  const lang = localStorage.getItem('lang') || 'en';
  return translations[key]?.[lang] || key;
}

function applyTranslations() {
  const lang = localStorage.getItem('lang') || 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = translations[lang][key];
    if (translated) el.innerText = translated;
  });
}

const translations = {
  en: {
    admin_panel: 'Admin Panel',
    shop_settings: 'Shop Settings',
    shop_name: 'Shop Name:',
    shop_address: 'Shop Address:',
    shop_logo: 'Shop Logo:',
    save: 'Save',
    user_management: 'User Management',
    username: 'Username:',
    password: 'Password:',
    role: 'Role:',
    cashier: 'Cashier',
    admin: 'Admin',
    create_user: 'Create User',
    actions: 'Actions'
  },
  ar: {
    admin_panel: 'لوحة التحكم',
    shop_settings: 'إعدادات المتجر',
    shop_name: 'اسم المتجر:',
    shop_address: 'عنوان المتجر:',
    shop_logo: 'شعار المتجر:',
    save: 'حفظ',
    user_management: 'إدارة المستخدمين',
    username: 'اسم المستخدم:',
    password: 'كلمة المرور:',
    role: 'الدور:',
    cashier: 'الكاشير',
    admin: 'مشرف',
    create_user: 'إنشاء مستخدم',
    actions: 'الإجراءات'
  }
};