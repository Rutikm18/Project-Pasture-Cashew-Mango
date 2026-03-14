/**
 * Pasture analytics — sends pageviews and clicks to /api/analytics.
 * Backend stores: type, page, url, referrer, userAgent, screen, element, text, href, timestamp, ip.
 */
(function () {
  const API = '/api/analytics';
  var lastClickSent = 0;
  var CLICK_THROTTLE_MS = 800;

  function getPageName() {
    var path = (typeof location !== 'undefined' && location.pathname) || '';
    if (path.indexOf('order') !== -1) return 'order';
    if (path.indexOf('hapus') !== -1) return 'hapus';
    if (path.indexOf('cashew') !== -1 || path === '/' || path === '') return 'cashew';
    return path.replace(/^\//, '').replace(/\.html$/, '') || 'unknown';
  }

  function sendEvent(type, extra) {
    var payload = {
      type: type,
      page: getPageName(),
      url: (typeof location !== 'undefined' && location.href) || '',
      referrer: (typeof document !== 'undefined' && document.referrer) || '',
      userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || '',
      screen: typeof screen !== 'undefined' ? { w: screen.width, h: screen.height } : {},
      timestamp: new Date().toISOString()
    };
    if (extra && typeof extra === 'object') {
      if (extra.element !== undefined) payload.element = String(extra.element).slice(0, 100);
      if (extra.text !== undefined) payload.text = String(extra.text).slice(0, 120);
      if (extra.href !== undefined) payload.href = String(extra.href).slice(0, 300);
    }
    try {
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function onLoad() {
    sendEvent('pageview');
  }

  function onClick(e) {
    var now = Date.now();
    if (now - lastClickSent < CLICK_THROTTLE_MS) return;
    var t = e.target;
    if (!t || !t.closest) return;
    var clickable = t.closest('a, button, [role="button"], .btn-main, .btn-ghost, .add-btn, .checkout-btn, .upi-btn, .wa-btn, .confirm-btn, .nav-cta, .cart-pill, .cart-pill *, .grade-btn, .vpack-btn, .fruit-group');
    if (!clickable) return;
    lastClickSent = now;
    var text = (clickable.textContent || '').trim().slice(0, 80);
    sendEvent('click', {
      element: clickable.id || clickable.className || clickable.tagName || '',
      text: text,
      href: clickable.href || (clickable.closest && clickable.closest('a') && clickable.closest('a').href) || ''
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onLoad);
    } else {
      onLoad();
    }
    document.addEventListener('click', onClick, true);
  }
})();
