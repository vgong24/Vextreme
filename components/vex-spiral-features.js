/**
 * VEXTREME — components/vex-spiral-features.js
 *
 * Public Vex-ecosystem feature-registration adapter for the shared Spiral host.
 *
 * This module intentionally owns only PRESENTATION COMPOSITION:
 * - read one consumer-owned window.VEX_SPIRAL_FEATURES manifest;
 * - mount each admitted feature into #vex-spiral-group;
 * - route primary/secondary placement through the Spiral host's existing axis contract;
 * - delegate behavior either to an ordinary link or to one existing local control.
 *
 * It does NOT own the meaning/state/effect of any registered feature. In particular,
 * consumer repositories remain responsible for deciding which capabilities exist and
 * what their Controls do. Absence from VEX_SPIRAL_FEATURES is the feature gate.
 *
 * SOURCE / DISTRIBUTION OWNER
 *   vgong24/Vextreme (public)
 *
 * CROSS-REPOSITORY CONSUMER BOUNDARY
 *   Consumers should pin an exact Vextreme commit/release rather than @main, then
 *   provide their own manifest before this script loads. A Vextreme change must not
 *   silently mutate another repository's accepted public UI.
 *
 * MANIFEST ENTRY
 *   {
 *     id: 'stable-consumer-local-id',        // required
 *     label: 'Accessible feature name',      // required
 *     icon: '🫴',                            // optional text/emoji glyph
 *     title: 'Hover text',                   // optional; defaults to label
 *     axis: 'primary' | 'secondary',         // optional; defaults primary
 *     enabled: false,                        // optional explicit hold
 *     href: 'https://... or ./relative',     // link feature
 *     target: '#existing-local-control'      // OR local-control projection
 *   }
 *
 * Exactly one of href/target must resolve. The adapter never invents a fallback
 * behavior when the consumer did not provide one.
 *
 * [VXG RealForever]
 */

(function (global) {
  'use strict';

  var MANIFEST = 'VEX_SPIRAL_FEATURES';
  var STYLE_ID = 'vex-ecosystem-spiral-feature-style';

  function safeId(value) {
    if (typeof value !== 'string') return '';
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function safeHref(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      var url = new URL(value.trim(), document.baseURI);
      return (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : null;
    } catch (error) {
      return null;
    }
  }

  function safeTarget(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      document.querySelector(value.trim());
      return value.trim();
    } catch (error) {
      return null;
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.vex-ecosystem-spiral-feature{',
      'width:40px;height:40px;border-radius:50%;flex:0 0 auto;',
      'display:flex;align-items:center;justify-content:center;padding:0;',
      'border:1px solid var(--vex-spiral-orb-border,rgba(0,0,0,.12));',
      'background:var(--vex-spiral-orb-bg,rgba(255,255,255,.18));',
      'color:var(--vex-spiral-orb-fg,inherit);',
      'box-shadow:0 2px 8px rgba(0,0,0,.12);',
      'font:inherit;font-size:18px;line-height:1;text-decoration:none;cursor:pointer;',
      'transition:background .2s,transform .2s,border-color .2s,color .2s;',
      '}',
      '.vex-ecosystem-spiral-feature:hover{',
      'background:var(--vex-spiral-orb-hover-bg,rgba(255,255,255,.32));',
      'transform:translateY(-1px);',
      '}',
      '.vex-ecosystem-spiral-feature:focus-visible{outline:2px solid currentColor;outline-offset:2px;}',
    ].join('');
    document.head.appendChild(style);
  }

  function mountFeature(group, item) {
    if (!item || typeof item !== 'object' || item.enabled === false) return;

    var id = safeId(item.id);
    var label = typeof item.label === 'string' ? item.label.trim() : '';
    if (!id || !label) return;
    if (group.querySelector('[data-vex-spiral-feature-id="' + id + '"]')) return;

    var href = safeHref(item.href);
    var target = safeTarget(item.target);
    if ((href && target) || (!href && !target)) return;

    var node = href ? document.createElement('a') : document.createElement('button');
    node.className = 'vex-ecosystem-spiral-feature';
    node.setAttribute('data-vex-spiral-feature-id', id);
    node.setAttribute('aria-label', label);
    node.title =
      (typeof item.title === 'string' && item.title.trim())
        ? item.title.trim()
        : label;
    node.textContent =
      (typeof item.icon === 'string' && item.icon.trim())
        ? item.icon.trim()
        : '•';

    if (item.axis === 'secondary') {
      node.setAttribute('data-vex-spiral-axis', 'secondary');
    }

    if (href) {
      node.href = href;
      node.setAttribute('data-vex-spiral-feature-kind', 'link');
    } else {
      node.type = 'button';
      node.setAttribute('data-vex-spiral-feature-kind', 'control');
      node.addEventListener('click', function () {
        var control = document.querySelector(target);
        if (!control) return;
        if (control.disabled || control.getAttribute('aria-disabled') === 'true') return;
        control.click();
      });
    }

    group.appendChild(node);
  }

  function mount() {
    var group = document.getElementById('vex-spiral-group');
    var features = global[MANIFEST];

    if (!group || !Array.isArray(features) || !features.length) return;

    injectStyles();
    features.forEach(function (item) {
      mountFeature(group, item);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}(window));

// [VXG RealForever]
