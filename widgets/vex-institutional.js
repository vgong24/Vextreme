/**
 * VEXTREME — widgets/vex-institutional.js
 *
 * Shared progressive enhancement for institutional surfaces:
 *
 * 1. Theme swaps only between the registry-declared foundation variants.
 * 2. Language applies compiled scope bundles through the native selector that
 *    later localization rows may activate.
 *
 * English remains authored in the HTML, so this widget cannot make the page
 * unreadable when JavaScript, storage, or a bundle request is unavailable.
 * Support routes intentionally do not live here; their data and effect
 * boundary belongs to the separate support-domain row.
 */

(function () {
  'use strict';

  var CDN_BASE = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  var LS_LANG = 'vex-lang';
  var LS_THEME = 'vex-inst-theme';
  var LANG_DEFAULT = 'en';
  var THEME_DARK = 'foundation';
  var THEME_LIGHT = 'foundation-light';
  var URL_LANG_PARAM = 'lang';

  var LANG_NAMES = {
    en: 'English',
    ja: '日本語',
    zh: '中文'
  };

  function scopeRelPath(scope, category) {
    var cat = (scope === 'common') ? 'system' : (category || 'production');
    var segs = scope.split('.');
    return [cat].concat(segs.slice(0, -1), segs[segs.length - 1]).join('/');
  }

  function config() {
    return {
      scopes: window.VEX_STRING_SCOPES || [],
      category: window.VEX_STRING_CATEGORY || 'production',
      root: window.VEX_INST_ROOT || '../'
    };
  }

  function fetchJSON(url) {
    return fetch(url, { credentials: 'omit' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }

  function fetchWithFallback(relPath) {
    var cfg = config();
    return fetchJSON(cfg.root + relPath).catch(function () {
      return fetchJSON(CDN_BASE + '/' + relPath);
    });
  }

  function storedTheme() {
    try {
      var value = localStorage.getItem(LS_THEME);
      return (value === THEME_LIGHT || value === THEME_DARK) ? value : null;
    } catch (error) {
      return null;
    }
  }

  function applyTheme(theme, button) {
    document.documentElement.setAttribute('data-theme', theme);
    if (button) button.setAttribute('aria-pressed', theme === THEME_LIGHT ? 'true' : 'false');
    try { localStorage.setItem(LS_THEME, theme); } catch (error) {}
  }

  function initTheme() {
    var button = document.querySelector('[data-vex-theme-toggle]');
    var initial = storedTheme();

    if (!initial) {
      var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      initial = prefersLight ? THEME_LIGHT : THEME_DARK;
    }
    applyTheme(initial, button);

    if (!button) return;
    button.hidden = false;
    button.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === THEME_LIGHT ? THEME_DARK : THEME_LIGHT, button);
    });
  }

  function urlLang() {
    try { return new URLSearchParams(location.search).get(URL_LANG_PARAM); }
    catch (error) { return null; }
  }

  function syncUrlLang(lang) {
    try {
      var params = new URLSearchParams(location.search);
      if (lang === LANG_DEFAULT) params.delete(URL_LANG_PARAM);
      else params.set(URL_LANG_PARAM, lang);
      var search = params.toString();
      var next = location.pathname + (search ? '?' + search : '') + location.hash;
      if (next !== location.pathname + location.search + location.hash && history.replaceState) {
        history.replaceState(null, '', next);
      }
    } catch (error) {}
  }

  function loadBundles(lang) {
    var cfg = config();
    var scopes = cfg.scopes.slice();
    if (scopes.indexOf('common') === -1) scopes.unshift('common');

    return Promise.all(scopes.map(function (scope) {
      var rel = 'data/strings/compiled/scopes/' + scopeRelPath(scope, cfg.category) + '.' + lang + '.json';
      return fetchWithFallback(rel).catch(function () { return {}; });
    })).then(function (parts) {
      var merged = {};
      parts.forEach(function (part) {
        Object.keys(part).forEach(function (key) { merged[key] = part[key]; });
      });
      return merged;
    });
  }

  function applyStrings(strings) {
    var elements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
      var entry = strings[elements[i].getAttribute('data-i18n')];
      if (entry && entry.text) elements[i].textContent = entry.text;
    }

    var labelled = document.querySelectorAll('[data-i18n-aria]');
    for (var j = 0; j < labelled.length; j++) {
      var ariaEntry = strings[labelled[j].getAttribute('data-i18n-aria')];
      var label = ariaEntry && (ariaEntry['aria-label'] || ariaEntry.text);
      if (label) labelled[j].setAttribute('aria-label', label);
    }

    var described = document.querySelectorAll('[data-i18n-alt]');
    for (var k = 0; k < described.length; k++) {
      var altEntry = strings[described[k].getAttribute('data-i18n-alt')];
      if (altEntry && altEntry.text) described[k].setAttribute('alt', altEntry.text);
    }
  }

  function setLang(lang, select) {
    document.documentElement.setAttribute('lang', lang);
    if (select) select.value = lang;
    syncUrlLang(lang);
    try { localStorage.setItem(LS_LANG, lang); } catch (error) {}
    return loadBundles(lang).then(applyStrings).catch(function () {});
  }

  function initLang() {
    var select = document.querySelector('[data-vex-lang-select]');
    if (!select) return;

    var available = Array.prototype.map.call(select.options, function (option) {
      return option.value;
    });
    var lang = urlLang();

    if (!lang || available.indexOf(lang) === -1) {
      try { lang = localStorage.getItem(LS_LANG); } catch (error) { lang = null; }
    }
    if (!lang || available.indexOf(lang) === -1) lang = LANG_DEFAULT;

    select.hidden = false;
    var label = document.querySelector('[data-vex-lang-label]');
    if (label) label.hidden = false;
    select.addEventListener('change', function () { setLang(select.value, select); });

    if (lang !== LANG_DEFAULT) setLang(lang, select);
    else select.value = LANG_DEFAULT;

    Array.prototype.forEach.call(select.options, function (option) {
      if (LANG_NAMES[option.value]) option.textContent = LANG_NAMES[option.value];
    });
  }

  function mount() {
    initTheme();
    initLang();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}());

// [VXG RealForever]
