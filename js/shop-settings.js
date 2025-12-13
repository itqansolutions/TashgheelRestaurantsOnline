// Add this to the end of admin-app.js or create as separate file

// Shop Settings Functions
window.saveShopSettings = function () {
    const shopName = document.getElementById('shop-name')?.value || '';
    const shopAddress = document.getElementById('shop-address')?.value || '';
    const footerMessage = document.getElementById('footer-message')?.value || '';
    const logoInput = document.getElementById('shop-logo');

    // Get existing logo or new one
    let shopLogo = localStorage.getItem('shopLogo') || '';

    if (logoInput && logoInput.files && logoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            shopLogo = e.target.result;
            saveSettings();
        };
        reader.readAsDataURL(logoInput.files[0]);
    } else {
        saveSettings();
    }

    function saveSettings() {
        // Save to localStorage
        localStorage.setItem('shopName', shopName);
        localStorage.setItem('shopAddress', shopAddress);
        localStorage.setItem('footerMessage', footerMessage);
        if (shopLogo) {
            localStorage.setItem('shopLogo', shopLogo);
        }

        // Also save to EnhancedSecurity if available
        if (window.EnhancedSecurity) {
            window.EnhancedSecurity.storeSecureData('shop_settings', {
                shopName,
                shopAddress,
                footerMessage,
                shopLogo
            });
        }

        alert('✅ Shop settings saved successfully!');
        console.log('Saved:', { shopName, shopAddress, footerMessage, logoLength: shopLogo.length });
    }
};

window.loadShopSettings = function () {
    // Try localStorage first
    const shopName = localStorage.getItem('shopName') || '';
    const shopAddress = localStorage.getItem('shopAddress') || '';
    const footerMessage = localStorage.getItem('footerMessage') || '';
    const shopLogo = localStorage.getItem('shopLogo') || '';

    if (document.getElementById('shop-name')) {
        document.getElementById('shop-name').value = shopName;
    }
    if (document.getElementById('shop-address')) {
        document.getElementById('shop-address').value = shopAddress;
    }
    if (document.getElementById('footer-message')) {
        document.getElementById('footer-message').value = footerMessage;
    }
    if (shopLogo && document.getElementById('logo-preview')) {
        document.getElementById('logo-preview').src = shopLogo;
        document.getElementById('logo-preview').style.display = 'block';
    }

    console.log('Loaded:', { shopName, shopAddress, footerMessage, hasLogo: !!shopLogo });
};

// Auto-load on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadShopSettings);
} else {
    loadShopSettings();
}
