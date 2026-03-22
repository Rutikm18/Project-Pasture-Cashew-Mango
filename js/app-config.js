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
    document.querySelectorAll('[data-config="whatsapp-href-2"]').forEach(function (el) {
      var num = (brand.phoneWhatsApp2 || '').replace(/\D/g, '');
      if (num) el.setAttribute('href', 'https://wa.me/' + (num.length === 10 ? '91' + num : num));
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

  /**
   * Pricing logic:
   *   mrp          = original / selling price (shown crossed out when discounted)
   *   discountPct  = % off mrp  →  offerPrice = round(mrp × (1 − pct/100))
   *   offerPrice   = explicit offer price (overrides discountPct when set)
   *   price        = effective cart price (always kept in sync by admin save)
   *
   * Priority: offerPrice > discountPct > no discount (show mrp only)
   */
  function computePricing(p) {
    var mrp = p.mrp != null ? p.mrp : (p.price || 0);
    var offer = null, pct = 0;
    if (p.offerPrice != null && p.offerPrice > 0 && p.offerPrice < mrp) {
      offer = p.offerPrice;
      pct = Math.round((1 - offer / mrp) * 100);
    } else if (p.discountPct != null && p.discountPct > 0 && p.discountPct < 100) {
      pct = Math.round(p.discountPct);
      offer = Math.round(mrp * (1 - p.discountPct / 100));
    }
    return { mrp: mrp, offer: offer, pct: pct, effectivePrice: offer != null ? offer : mrp };
  }

  /** Build innerHTML for .prod-price element */
  function buildProdPriceHTML(pr, puText) {
    if (pr.offer != null) {
      return '<div class="prod-offer-row">' +
        '<span class="prod-offer-price"><span class="rs">₹</span>' + pr.offer.toLocaleString() + '</span>' +
        '<span class="prod-off-badge">' + pr.pct + '% off</span>' +
        '</div>' +
        '<del class="prod-mrp">₹' + pr.mrp.toLocaleString() + '</del>' +
        '<span class="pu">' + puText + '</span>';
    }
    return '<span class="rs">₹</span>' + pr.mrp.toLocaleString() + '<span class="pu">' + puText + '</span>';
  }

  /** Build innerHTML for .vp-price element */
  function buildVpPriceHTML(pr) {
    if (pr.offer != null) {
      return '<div class="vp-offer-row">' +
        '<span class="vp-offer-price">₹' + pr.offer.toLocaleString() + '</span>' +
        '<span class="vp-off-badge">' + pr.pct + '% off</span>' +
        '</div>' +
        '<del class="vp-mrp">₹' + pr.mrp.toLocaleString() + '</del>';
    }
    return '₹' + pr.mrp.toLocaleString();
  }

  /** Build innerHTML for .gf-price element (cashew grades section) */
  function buildGfPriceHTML(pr, perText) {
    if (pr.offer != null) {
      return '<div class="gf-off-row">' +
        '<span class="gf-offer-price">₹' + pr.offer.toLocaleString() + '</span>' +
        '<span class="gf-off-badge">' + pr.pct + '% off</span>' +
        '</div>' +
        '<del class="gf-mrp">₹' + pr.mrp.toLocaleString() + '</del>' +
        '<span class="per" style="margin-left:4px">' + perText + '</span>';
    }
    return '₹' + pr.mrp.toLocaleString() + ' <span class="per">' + perText + '</span>';
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
      var pr = computePricing(p);
      var card = document.getElementById('card-' + p.id);
      if (card) {
        var priceEl = card.querySelector('.prod-price');
        if (priceEl) {
          var pu = card.querySelector('.prod-price .pu');
          var puText = pu ? pu.textContent : 'per ' + (p.weight || '');
          priceEl.innerHTML = buildProdPriceHTML(pr, puText);
        }
        var btn = document.getElementById('add-' + p.id);
        if (btn) {
          btn.onclick = function () {
            window.addToCart(p.id, p.name, p.weight, pr.effectivePrice, p.icon || '🥜', p.mrp);
          };
        }
      }
      // Update cashew.html grades section (gf-price)
      var gfEl = document.getElementById('gfPrice-' + p.id);
      if (gfEl) {
        var perText = gfEl.dataset.per || '/ ' + (p.weight || '');
        gfEl.innerHTML = buildGfPriceHTML(pr, perText);
        var gfBtn = document.getElementById('gfBtn-' + p.id);
        if (gfBtn) gfBtn.href = 'order.html?grade=' + (p.id.split('-')[0] || '');
      }
    });

    valuePacks.forEach(function (p) {
      var pr = computePricing(p);
      var pack = document.querySelector('.vpack[data-pack-id="' + p.id + '"]');
      if (!pack) return;
      var priceEl = pack.querySelector('.vp-price');
      if (priceEl) priceEl.innerHTML = buildVpPriceHTML(pr);
      pack.onclick = function () {
        window.addToCart(p.id, p.name, p.weight, pr.effectivePrice, p.icon || '📦', p.mrp);
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
