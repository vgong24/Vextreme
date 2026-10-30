/**
 * VEXTREME — widgets/fab-demo.js
 *
 * Floating orb linking to the architecture demo page (pages/vextreme-demo.html).
 * Sits next to widgets/fab-lang.js (44px, translucent, top-right) but offset
 * left of it so both can mount on the same page without overlapping.
 *
 * Self-contained IIFE — no global exports, no framework dependencies.
 * Works standalone as a <script> tag or bundled inside a God Script.
 */

(function () {
  'use strict';

  var DEMO_URL = 'https://vgong24.github.io/Vextreme/pages/vextreme-demo.html';

  function injectStyles() {
    var css = [
      '#vex-demo-fab {',
      '  position: fixed;',
      '  top: 16px;',
      '  right: 68px;',
      '  z-index: 9999;',
      '}',
      '#vex-demo-fab-btn {',
      '  width: 44px;',
      '  height: 44px;',
      '  border-radius: 50%;',
      '  border: none;',
      '  background: rgba(255,255,255,0.18);',
      '  backdrop-filter: blur(6px);',
      '  -webkit-backdrop-filter: blur(6px);',
      '  font-size: 20px;',
      '  cursor: pointer;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.12);',
      '  transition: background 0.2s;',
      '  line-height: 1;',
      '  padding: 0;',
      '  text-decoration: none;',
      '  color: inherit;',
      '}',
      '#vex-demo-fab-btn:hover { background: rgba(255,255,255,0.32); }',
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mount() {
    injectStyles();

    var container = document.createElement('div');
    container.id = 'vex-demo-fab';

    var btn = document.createElement('a');
    btn.id = 'vex-demo-fab-btn';
    btn.href = DEMO_URL;
    btn.setAttribute('aria-label', 'How this is built — architecture demo');
    btn.setAttribute('title', 'How this is built');
    btn.textContent = '◉';

    container.appendChild(btn);
    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}());

// [VXG RealForever]
