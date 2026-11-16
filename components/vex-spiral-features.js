/**
 * VEXTREME — components/vex-spiral-features.js
 *
 * Public Vex-ecosystem feature-registration adapter for the shared Spiral host.
 *
 * This module intentionally owns only PRESENTATION COMPOSITION:
 * - read one consumer-owned window.VEX_SPIRAL_FEATURES manifest;
 * - mount each admitted feature into #vex-spiral-group;
 * - route primary/secondary placement through the Spiral host's existing axis contract;
 * - delegate behavior either to an ordinary link or to one existing local control;
 * - observe the host trigger's aria-expanded state and expose one reversible presentation circuit
 *   (closed -> open -> closed -> open) without taking ownership of feature meaning.
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
 *     icon: '🫴',                            // optional fallback text/emoji glyph
 *     title: 'Hover text',                   // optional; defaults to label
 *     axis: 'primary' | 'secondary',         // optional; defaults primary
 *     enabled: false,                        // optional explicit hold
 *     href: 'https://... or ./relative',     // link feature
 *     target: '#existing-local-control'      // OR local-control projection
 *                                              // target may publish data-vex-spiral-icon
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
      // Ecosystem consumers keep lanes mounted so closing can animate back into the trigger
      // instead of display:none cutting the circuit. The Vextreme host remains unchanged.
      '#vex-spiral-group{display:contents!important;}',
      '#vex-spiral-primary{',
      'gap:0!important;max-width:0!important;opacity:0;visibility:hidden;pointer-events:none;',
      'overflow:hidden!important;transform:translateX(22px) scale(.82);transform-origin:right center;',
      'transition:max-width .34s ease,gap .34s ease,opacity .18s ease,transform .34s ease,visibility 0s linear .34s;',
      '}',
      '#vex-spiral-group.open #vex-spiral-primary{',
      'gap:8px!important;max-width:min(62vw,420px)!important;opacity:1;visibility:visible;pointer-events:auto;',
      'overflow:visible!important;transform:translateX(0) scale(1);',
      'transition:max-width .34s ease,gap .34s ease,opacity .24s ease .06s,transform .34s ease,visibility 0s;',
      '}',
      '#vex-spiral-secondary{',
      'gap:0!important;max-height:0;opacity:0;visibility:hidden;pointer-events:none;overflow:hidden!important;',
      'transform:translateY(-12px) scale(.86);transform-origin:top center;',
      'transition:max-height .3s ease,gap .3s ease,opacity .16s ease,transform .3s ease,visibility 0s linear .3s;',
      '}',
      '#vex-spiral-group.open #vex-spiral-secondary{',
      'gap:8px!important;max-height:360px;opacity:1;visibility:visible;pointer-events:auto;overflow:visible!important;',
      'transform:translateY(0) scale(1);',
      'transition:max-height .3s ease,gap .3s ease,opacity .22s ease .06s,transform .3s ease,visibility 0s;',
      '}',
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

    var control = target ? document.querySelector(target) : null;
    if (target && !control) return;

    var node = href ? document.createElement('a') : document.createElement('button');
    node.className = 'vex-ecosystem-spiral-feature';
    node.setAttribute('data-vex-spiral-feature-id', id);
    node.setAttribute('aria-label', label);
    node.title =
      (typeof item.title === 'string' && item.title.trim())
        ? item.title.trim()
        : label;
    var fallbackIcon =
      (typeof item.icon === 'string' && item.icon.trim())
        ? item.icon.trim()
        : '•';

    function syncProjectedIcon() {
      var projected =
        control &&
        typeof control.getAttribute === 'function'
          ? control.getAttribute('data-vex-spiral-icon')
          : null;
      node.textContent = (typeof projected === 'string' && projected.trim())
        ? projected.trim()
        : fallbackIcon;
    }

    syncProjectedIcon();

    if (control) {
      var iconObserver = new MutationObserver(function (records) {
        if (!records.some(function (record) {
          return record.attributeName === 'data-vex-spiral-icon';
        })) return;
        syncProjectedIcon();
      });
      iconObserver.observe(control, {
        attributes: true,
        attributeFilter: ['data-vex-spiral-icon'],
      });
    }

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
        if (!control) return;
        if (control.disabled || control.getAttribute('aria-disabled') === 'true') return;

        // Preserve the consumer's existing control as behavior owner without creating a second
        // bubbling click that the shared host could misread as an outside-click close gesture.
        control.dispatchEvent(new MouseEvent('click', {
          bubbles: false,
          cancelable: true,
          view: global,
        }));
      });
    }

    group.appendChild(node);
  }

  function mount() {
    var group = document.getElementById('vex-spiral-group');
    var trigger = document.getElementById('vex-spiral-trigger');
    var container = document.getElementById('vex-spiral-fab');
    var features = global[MANIFEST];

    if (!group || !trigger || !container || !Array.isArray(features) || !features.length) return;

    injectStyles();
    features.forEach(function (item) {
      mountFeature(group, item);
    });

    function setPresentationOpen(open, reason) {
      var nextOpen = Boolean(open);
      container.setAttribute('data-vex-spiral-state', nextOpen ? 'open' : 'closed');
      container.dispatchEvent(new CustomEvent('vex:spiral-change', {
        bubbles: true,
        detail: {
          open: nextOpen,
          reason: reason || 'host-state',
        },
      }));
    }

    // The host remains the open/close owner. This adapter observes its accessibility state and
    // projects that state to consumers so their chrome can animate around the same circuit.
    var observeTrigger = new MutationObserver(function (records) {
      if (!records.some(function (record) { return record.attributeName === 'aria-expanded'; })) return;
      setPresentationOpen(trigger.getAttribute('aria-expanded') === 'true', 'host-state');
    });
    observeTrigger.observe(trigger, { attributes: true, attributeFilter: ['aria-expanded'] });
    setPresentationOpen(trigger.getAttribute('aria-expanded') === 'true', 'mount');

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || trigger.getAttribute('aria-expanded') !== 'true') return;
      trigger.click();
      trigger.focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}(window));

// [VXG RealForever]
