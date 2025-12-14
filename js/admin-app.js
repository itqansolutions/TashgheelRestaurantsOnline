// admin-app.js
// Local translations removed, using global translations.js

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

    const settings = {
      shopName: shopNameInput.value.trim(),
      shopAddress: shopAddressInput.value.trim(),
      footerMessage: footerMessageInput.value.trim(),
      shopLogo: uploadedLogoBase64.startsWith('data:image') ? uploadedLogoBase64 : ''
    };

    // Save to EnhancedSecurity for invoice use
    window.EnhancedSecurity.storeSecureData('shop_settings', settings);

    // Also save to localStorage for backward compatibility
    localStorage.setItem('shopName', settings.shopName);
    localStorage.setItem('shopAddress', settings.shopAddress);
    localStorage.setItem('footerMessage', settings.footerMessage);
    if (settings.shopLogo) {
      localStorage.setItem('shopLogo', settings.shopLogo);
    }

    alert('Settings saved successfully!');
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

  window.handleDeleteUser = function (id) {
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

    const allowedPages = Array.from(document.querySelectorAll('input[name="access"]:checked')).map(cb => cb.value);

    if (!username || !password) return alert('Fill all fields');

    try {
      addUser({
        username,
        password,
        role,
        fullName: username,
        allowedPages
      });

      alert('User created successfully');
      userForm.reset();
      loadUsers();
    } catch (e) {
      alert(e.message);
    }
  });

  loadUsers();

  // Re-render when language changes if needed (currently dynamic content is minimal)
  window.addEventListener('languageChanged', () => {
    // loadUsers(); // If user roles or other things need translation in the table
  });
});
