/**
 * VEXTREME — widgets/sw-register.js
 *
 * Service Worker registration. Add ONE script tag to each page that should
 * participate in SW caching (typically all pages on GitHub Pages):
 *
 *   <script src="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/widgets/sw-register.js"></script>
 *
 * This script is intentionally tiny — registration only, no logic.
 * The SW itself (sw.js at repo root) handles all caching behaviour.
 *
 * The SW must be served from the same origin as the pages it controls.
 * On GitHub Pages: https://vgong24.github.io/Vextreme/sw.js
 */

(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  var SW_URL = '/Vextreme/sw.js';

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(SW_URL, { scope: '/Vextreme/' })
      .then(function (reg) {
        // Registration succeeded — SW is installed or updating
        if (reg.waiting) {
          // A new SW is waiting to activate; skip waiting to update immediately.
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch(function (err) {
        // Registration failed — site still works, just without SW caching
        console.warn('[vextreme SW] Registration failed:', err);
      });
  });

}());

// [VXG RealForever]
