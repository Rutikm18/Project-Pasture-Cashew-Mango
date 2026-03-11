/**
 * Load site config from API and apply to page (brand, delivery, products).
 * Sets window.SITE_CONFIG and dispatches 'siteConfigReady' when done.
 */
(function () {
  const CONFIG_URL = '/api/config';

  function applyBrandConfig(data) {
    var brand = data.brand || {};
    document.querySelectorAll('[data-config="phone"]').forEach(function (el) {
      el.textContent = brand.phoneFormatted || '';
    });
    document.querySelectorAll('[data-config="phone-href"]').forEach(function (el) {
      el.setAttribute('href', 'tel:+91' + (brand.phone || '').replace(/\D/g, ''));
    });
    document.querySelectorAll('[data-config="whatsapp-href"]').forEach(function (el) {
      el.setAttribute('href', 'https://wa.me/' + (brand.phoneWhatsApp || '91' + (brand.phone || '').replace(/\D/g, '')));
    });
    document.querySelectorAll('[data-config="email"]').forEach(function (el) {
      el.textContent = brand.email || '';
    });
    document.querySelectorAll('[data-config="email-href"]').forEach(function (el) {
      el.setAttribute('href', 'mailto:' + (brand.email || ''));
    });
    document.querySelectorAll('[data-config="address"]').forEach(function (el) {
      el.textContent = brand.address || '';
    });
    document.querySelectorAll('[data-config="brand-name"]').forEach(function (el) {
      el.textContent = brand.name || 'Pasture';
    });
    document.querySelectorAll('[data-config="tagline-mr"]').forEach(function (el) {
      el.textContent = brand.taglineMr || '';
    });
  }

  function applyOrderConfig(data) {
    var delivery = data.delivery || {};
    var freeAbove = delivery.freeAbove != null ? delivery.freeAbove : 999;
    document.querySelectorAll('[data-config="freeDelivery"]').forEach(function (el) {
      el.textContent = freeAbove;
    });

    var products = data.products || {};
    var cashew = products.cashew || [];
    var valuePacks = products.valuePacks || [];

    cashew.forEach(function (p) {
      var card = document.getElementById('card-' + p.id);
      if (!card) return;
      var priceEl = card.querySelector('.prod-price');
      if (priceEl) {
        var pu = card.querySelector('.prod-price .pu');
        var puText = pu ? pu.textContent : 'per ' + (p.weight || '');
        priceEl.innerHTML = '<span class="rs">₹</span>' + (p.price || 0).toLocaleString() + '<span class="pu">' + puText + '</span>';
      }
      var btn = document.getElementById('add-' + p.id);
      if (btn) {
        btn.onclick = function () {
          window.addToCart(p.id, p.name, p.weight, p.price, p.icon || '🥜');
        };
      }
    });

    valuePacks.forEach(function (p) {
      var pack = document.querySelector('.vpack[data-pack-id="' + p.id + '"]');
      if (!pack) return;
      var priceEl = pack.querySelector('.vp-price');
      if (priceEl) priceEl.textContent = '₹' + (p.price || 0).toLocaleString();
      pack.onclick = function () {
        window.addToCart(p.id, p.name, p.weight, p.price, p.icon || '📦');
      };
    });
  }

  function init() {
    fetch(CONFIG_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        window.SITE_CONFIG = data;
        applyBrandConfig(data);
        if (document.getElementById('cartCol')) applyOrderConfig(data);
        document.dispatchEvent(new CustomEvent('siteConfigReady', { detail: data }));
      })
      .catch(function (err) {
        console.warn('Config load failed, using defaults', err);
        window.SITE_CONFIG = { brand: {}, delivery: { freeAbove: 999, charge: 80 }, products: { cashew: [], valuePacks: [] }, coupons: [] };
        document.dispatchEvent(new CustomEvent('siteConfigReady', { detail: window.SITE_CONFIG }));
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
