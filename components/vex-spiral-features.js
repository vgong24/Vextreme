/**
 * VEXTREME — components/vex-spiral-features.js
 *
 * Public Vex-ecosystem feature-registration adapter for the shared Spiral host.
 *
 * This module intentionally owns only PRESENTATION COMPOSITION:
 * - read one consumer-owned window.VEX_SPIRAL_FEATURES manifest;
 * - mount each admitted feature into #vex-spiral-group;
 * - route primary/secondary placement through the Spiral host's existing axis contract;
 * - mount ordinary links as small feature orbs;
 * - adopt one existing local control node into the Spiral instead of creating a proxy control.
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
 *     icon: '🫴',                            // optional link glyph; local controls render themselves
 *     title: 'Hover text',                   // optional; defaults to label
 *     axis: 'primary' | 'secondary',         // optional; defaults primary
 *     enabled: false,                        // optional explicit hold
 *     href: 'https://... or ./relative',     // link feature
 *     target: '#existing-local-control'      // OR adopt this existing control node into the Spiral
 *   }
 *
 * Exactly one of href/target must resolve. A target control remains the same DOM Control with
 * the same event listeners, state projection and accessibility identity; only its presentation
 * coordinate changes. The adapter never forwards clicks or mirrors target state into a proxy.
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

    if (target) {
      var control = document.querySelector(target);
      if (!control) return;

      // Recycle the consumer's real Control. Do not create a second button, forward a click,
      // or mirror its state. VexArchitecture meaning stays with the existing Control owner;
      // this adapter changes only where that same Control is manifested.
      control.hidden = false;
      control.classList.add('vex-ecosystem-spiral-feature');
      control.setAttribute('data-vex-spiral-feature-id', id);
      control.setAttribute('data-vex-spiral-feature-kind', 'control');
      if (!control.getAttribute('aria-label')) control.setAttribute('aria-label', label);
      if (typeof item.title === 'string' && item.title.trim()) control.title = item.title.trim();
      if (item.axis === 'secondary') control.setAttribute('data-vex-spiral-axis', 'secondary');
      group.appendChild(control);
      return;
    }

    var node = document.createElement('a');
    node.className = 'vex-ecosystem-spiral-feature';
    node.href = href;
    node.setAttribute('data-vex-spiral-feature-id', id);
    node.setAttribute('data-vex-spiral-feature-kind', 'link');
    node.setAttribute('aria-label', label);
    node.title =
      (typeof item.title === 'string' && item.title.trim())
        ? item.title.trim()
        : label;
    node.textContent =
      (typeof item.icon === 'string' && item.icon.trim())
        ? item.icon.trim()
        : '↗';

    if (item.axis === 'secondary') {
      node.setAttribute('data-vex-spiral-axis', 'secondary');
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
