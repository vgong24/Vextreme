/**
 * VEXTREME — widgets/fab-links.js
 *
 * Generic configured-link child for the existing Spiral FAB.
 *
 * This widget does NOT create a trigger, floating position, or second FAB
 * foundation. It reads window.VEX_FAB_LINKS and appends safe anchor orbs into
 * #vex-spiral-group, which remains owned by widgets/vex-fab.js.
 *
 * Supported item shape:
 *   { id, href, label, title?, icon?, iconSrc? }
 *
 * - id / href / label are required.
 * - href and iconSrc resolve against document.baseURI and must use http(s).
 * - iconSrc is rendered through <img>; raw SVG/HTML strings are never injected.
 * - icon is a plain-text / emoji fallback.
 *
 * [VXG RealForever]
 */
(function (global) {
  'use strict';

  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      var url = new URL(value.trim(), document.baseURI);
      return (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : null;
    } catch (err) {
      return null;
    }
  }

  function safeId(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    var id = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return id || null;
  }

  function injectStyles() {
    if (document.getElementById('vex-fab-links-style')) return;
    var css = [
      '.vex-orb {',
      '  width: 40px;',
      '  height: 40px;',
      '  border-radius: 50%;',
      '  border: none;',
      '  flex: 0 0 auto;',
      '  background: rgba(255,255,255,0.18);',
      '  backdrop-filter: blur(6px);',
      '  -webkit-backdrop-filter: blur(6px);',
      '  font-size: 18px;',
      '  cursor: pointer;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.12);',
      '  transition: background 0.2s, transform 0.2s;',
      '  line-height: 1;',
      '  padding: 0;',
      '  text-decoration: none;',
      '  color: inherit;',
      '}',
      '.vex-orb:hover { background: rgba(255,255,255,0.32); transform: translateY(-1px); }',
      '.vex-link-orb img { width: 22px; height: 22px; object-fit: contain; display: block; }',
      '.vex-link-orb:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'vex-fab-links-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mount() {
    var group = document.getElementById('vex-spiral-group');
    var items = Array.isArray(global.VEX_FAB_LINKS) ? global.VEX_FAB_LINKS : [];
    if (!group || !items.length) return;

    injectStyles();

    items.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var id = safeId(item.id);
      var href = safeUrl(item.href);
      var label = typeof item.label === 'string' ? item.label.trim() : '';
      if (!id || !href || !label) return;
      if (group.querySelector('[data-vex-fab-link-id="' + id + '"]')) return;

      var link = document.createElement('a');
      link.className = 'vex-orb vex-link-orb';
      link.href = href;
      link.setAttribute('data-vex-fab-link-id', id);
      link.setAttribute('aria-label', label);
      link.title = (typeof item.title === 'string' && item.title.trim()) ? item.title.trim() : label;

      var iconSrc = safeUrl(item.iconSrc);
      if (iconSrc) {
        var image = document.createElement('img');
        image.src = iconSrc;
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        link.appendChild(image);
      } else {
        link.textContent = (typeof item.icon === 'string' && item.icon.trim()) ? item.icon.trim() : '↗';
      }

      group.appendChild(link);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}(window));

// [VXG RealForever]
