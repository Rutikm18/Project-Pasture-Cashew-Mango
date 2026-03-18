/**
 * Pasture — lightweight image lightbox
 * Add class="zoomable" to any <img> to enable click-to-enlarge.
 * Hover shows a zoom cursor; click opens fullscreen overlay.
 */
(function () {
  'use strict';

  function buildOverlay() {
    const ov = document.createElement('div');
    ov.id = 'lb-overlay';
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:99999',
      'background:rgba(28,15,6,.92)',
      'backdrop-filter:blur(12px)',
      'display:flex;align-items:center;justify-content:center',
      'opacity:0;transition:opacity .3s',
      'cursor:zoom-out',
    ].join(';');

    const img = document.createElement('img');
    img.id = 'lb-img';
    img.style.cssText = [
      'max-width:min(92vw,900px)',
      'max-height:90vh',
      'object-fit:contain',
      'border:1px solid rgba(232,185,74,.3)',
      'box-shadow:0 24px 80px rgba(0,0,0,.7)',
      'transform:scale(.92)',
      'transition:transform .35s cubic-bezier(.22,1,.36,1)',
      'display:block',
    ].join(';');

    const close = document.createElement('button');
    close.innerHTML = '&times;';
    close.style.cssText = [
      'position:absolute;top:20px;right:24px',
      'background:rgba(232,185,74,.15);border:1px solid rgba(232,185,74,.35)',
      'color:#F2D98B;font-size:1.6rem;line-height:1',
      'width:44px;height:44px;cursor:pointer',
      'font-family:sans-serif;border-radius:0',
      'display:flex;align-items:center;justify-content:center',
    ].join(';');

    const caption = document.createElement('p');
    caption.id = 'lb-caption';
    caption.style.cssText = [
      'position:absolute;bottom:24px;left:50%;transform:translateX(-50%)',
      'font-family:"Josefin Sans",sans-serif;font-size:.68rem;letter-spacing:2px',
      'color:rgba(242,217,139,.6);text-transform:uppercase;text-align:center',
      'max-width:80vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
    ].join(';');

    ov.appendChild(img);
    ov.appendChild(close);
    ov.appendChild(caption);
    document.body.appendChild(ov);

    function openLightbox(src, alt) {
      img.src = src;
      caption.textContent = alt || '';
      ov.style.display = 'flex';
      requestAnimationFrame(() => {
        ov.style.opacity = '1';
        img.style.transform = 'scale(1)';
      });
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      ov.style.opacity = '0';
      img.style.transform = 'scale(.92)';
      setTimeout(() => {
        ov.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    }

    ov.addEventListener('click', (e) => {
      if (e.target === ov || e.target === close) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ov.style.display !== 'none') closeLightbox();
    });

    return openLightbox;
  }

  function injectStyles() {
    const s = document.createElement('style');
    // Only set cursor; hover scale is handled per-context in each page's CSS
    s.textContent = 'img.zoomable{cursor:zoom-in;}';
    document.head.appendChild(s);
  }

  function init() {
    injectStyles();
    let open = null;

    function attach(img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        if (!open) open = buildOverlay();
        open(img.src, img.alt);
      });
    }

    // Attach to all existing .zoomable images
    document.querySelectorAll('img.zoomable').forEach(attach);

    // Watch for dynamically added images
    new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('img.zoomable')) attach(node);
          node.querySelectorAll && node.querySelectorAll('img.zoomable').forEach(attach);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
