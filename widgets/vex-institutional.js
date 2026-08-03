/**
 * VEXTREME — widgets/vex-institutional.js
 *
 * Shared progressive enhancement for the registry-owned institutional pages.
 * English remains authored in the HTML. Locale changes are fail-closed: one
 * complete compiled scope bundle is fetched, parsed, and validated before a
 * synchronous transaction changes any bound content or locale state.
 *
 * Support routes intentionally do not live here. Their held data and effect
 * boundary belongs to data/support-routes.json and remains inert.
 */

(function () {
  'use strict';

  var LS_LANG = 'vex-lang';
  var LS_THEME = 'vex-inst-theme';
  var LANG_DEFAULT = 'en';
  var LANGS = ['en', 'ja', 'zh'];
  var THEME_DARK = 'foundation';
  var THEME_LIGHT = 'foundation-light';
  var URL_LANG_PARAM = 'lang';
  var BUNDLE_TIMEOUT_MS = window.VEX_INST_BUNDLE_TIMEOUT_MS || 1400;
  var appliedLocale = LANG_DEFAULT;
  var latestIntent = 0;

  var LANG_NAMES = {
    en: 'English',
    ja: '日本語',
    zh: '中文'
  };

  function isLocale(value) {
    return LANGS.indexOf(value) !== -1;
  }

  function scopeRelPath(scope, category) {
    var cat = (scope === 'common') ? 'system' : (category || 'production');
    var segments = scope.split('.');
    return [cat].concat(segments.slice(0, -1), segments[segments.length - 1]).join('/');
  }

  function config() {
    return {
      scopes: (window.VEX_STRING_SCOPES || []).slice(),
      category: window.VEX_STRING_CATEGORY || 'production',
      root: window.VEX_INST_ROOT || '../'
    };
  }

  function timeout(promise, milliseconds) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('bundle timeout'));
      }, milliseconds);
      promise.then(function (value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, function (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function fetchJSON(url) {
    return timeout(fetch(url, { credentials: 'omit' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }), BUNDLE_TIMEOUT_MS);
  }

  function loadBundle(lang) {
    var cfg = config();
    if (!cfg.scopes.length) return Promise.reject(new Error('no string scope declared'));
    return Promise.all(cfg.scopes.map(function (scope) {
      var rel = 'data/strings/compiled/scopes/' + scopeRelPath(scope, cfg.category) + '.' + lang + '.json';
      return fetchJSON(cfg.root + rel);
    })).then(function (parts) {
      var merged = {};
      parts.forEach(function (part) {
        if (!part || typeof part !== 'object' || Array.isArray(part)) {
          throw new Error('bundle root must be an object');
        }
        Object.keys(part).forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(merged, key)) {
            throw new Error('duplicate bundle key: ' + key);
          }
          merged[key] = part[key];
        });
      });
      return merged;
    });
  }

  function readStoredLang() {
    try {
      var value = localStorage.getItem(LS_LANG);
      return isLocale(value) ? value : null;
    } catch (error) {
      return null;
    }
  }

  function installLocaleHold() {
    var explicit = null;
    var hasExplicit = false;
    try {
      var params = new URLSearchParams(location.search);
      hasExplicit = params.has(URL_LANG_PARAM);
      explicit = params.get(URL_LANG_PARAM);
    } catch (error) {}

    var invalidUrl = hasExplicit && !isLocale(explicit);
    var target = hasExplicit
      ? (isLocale(explicit) ? explicit : LANG_DEFAULT)
      : (readStoredLang() || LANG_DEFAULT);
    var boot = { target: target, invalidUrl: invalidUrl, timer: null };
    window.VEX_INST_LOCALE_BOOT = boot;

    if (target !== LANG_DEFAULT) {
      document.documentElement.setAttribute('data-vex-locale-hold', target);
      boot.timer = setTimeout(function () {
        boot.timer = null;
        if (document.documentElement.removeAttribute) {
          document.documentElement.removeAttribute('data-vex-locale-hold');
        }
      }, 1900);
    }
  }

  function initialLocaleIntent() {
    var boot = window.VEX_INST_LOCALE_BOOT;
    if (boot && isLocale(boot.target)) {
      return { locale: boot.target, invalidUrl: Boolean(boot.invalidUrl) };
    }

    var explicit = null;
    var hasExplicit = false;
    try {
      var params = new URLSearchParams(location.search);
      hasExplicit = params.has(URL_LANG_PARAM);
      explicit = params.get(URL_LANG_PARAM);
    } catch (error) {}
    if (hasExplicit) {
      return { locale: isLocale(explicit) ? explicit : LANG_DEFAULT, invalidUrl: !isLocale(explicit) };
    }
    return { locale: readStoredLang() || LANG_DEFAULT, invalidUrl: false };
  }

  function releaseLocaleHold() {
    var boot = window.VEX_INST_LOCALE_BOOT;
    if (boot && boot.timer) {
      clearTimeout(boot.timer);
      boot.timer = null;
    }
    if (document.documentElement.removeAttribute) {
      document.documentElement.removeAttribute('data-vex-locale-hold');
    }
  }

  function bundleValue(bundle, key, kind) {
    var entry = bundle[key];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('missing bundle key: ' + key);
    }
    var value = kind === 'aria' ? (entry['aria-label'] || entry.text) : entry.text;
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('empty bundle value: ' + key);
    }
    return value;
  }

  function validateAndPrepare(bundle) {
    var keys = Object.keys(bundle);
    if (!keys.length) throw new Error('bundle is empty');
    keys.forEach(function (key) {
      var entry = bundle[key];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
          typeof entry.text !== 'string' || !entry.text.trim()) {
        throw new Error('invalid full-bundle entry: ' + key);
      }
      if (Object.prototype.hasOwnProperty.call(entry, 'aria-label') &&
          (typeof entry['aria-label'] !== 'string' || !entry['aria-label'].trim())) {
        throw new Error('invalid full-bundle aria-label: ' + key);
      }
    });

    var updates = [];
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (element) {
      updates.push({ element: element, kind: 'text', value: bundleValue(bundle, element.getAttribute('data-i18n'), 'text') });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-aria]'), function (element) {
      updates.push({ element: element, kind: 'aria', value: bundleValue(bundle, element.getAttribute('data-i18n-aria'), 'aria') });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-alt]'), function (element) {
      updates.push({ element: element, kind: 'alt', value: bundleValue(bundle, element.getAttribute('data-i18n-alt'), 'alt') });
    });
    return updates;
  }

  function localizedInstitutionalHref(rawHref, lang) {
    if (typeof rawHref !== 'string' || !rawHref || rawHref.charAt(0) === '#') return rawHref;
    var match = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(rawHref);
    if (!match || !/(^|\/)(?:vextreme-home|vex-support)\.html$/.test(match[1])) return rawHref;
    var params;
    try { params = new URLSearchParams((match[2] || '').replace(/^\?/, '')); }
    catch (error) { return rawHref; }
    if (lang === LANG_DEFAULT) params.delete(URL_LANG_PARAM);
    else params.set(URL_LANG_PARAM, lang);
    var search = params.toString();
    return match[1] + (search ? '?' + search : '') + (match[3] || '');
  }

  function nextPageUrl(lang) {
    var params = new URLSearchParams(location.search);
    if (lang === LANG_DEFAULT) params.delete(URL_LANG_PARAM);
    else params.set(URL_LANG_PARAM, lang);
    var search = params.toString();
    return location.pathname + (search ? '?' + search : '') + location.hash;
  }

  function transactLocale(lang, bundle, select) {
    var updates = validateAndPrepare(bundle);
    var links = [];
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (anchor) {
      var before = anchor.getAttribute('href');
      var after = localizedInstitutionalHref(before, lang);
      if (before !== after) links.push({ element: anchor, before: before, after: after });
    });

    var root = document.documentElement;
    var previousLang = root.getAttribute('lang') || LANG_DEFAULT;
    var previousSelect = select ? select.value : null;
    var previousUrl = location.pathname + location.search + location.hash;
    var previousStored = null;
    try { previousStored = localStorage.getItem(LS_LANG); } catch (error) {}
    var snapshots = updates.map(function (update) {
      return {
        update: update,
        before: update.kind === 'text'
          ? update.element.textContent
          : update.element.getAttribute(update.kind === 'aria' ? 'aria-label' : 'alt')
      };
    });

    try {
      updates.forEach(function (update) {
        if (update.kind === 'text') update.element.textContent = update.value;
        else update.element.setAttribute(update.kind === 'aria' ? 'aria-label' : 'alt', update.value);
      });
      links.forEach(function (link) { link.element.setAttribute('href', link.after); });
      root.setAttribute('lang', lang);
      if (select) select.value = lang;

      var nextUrl = nextPageUrl(lang);
      if (nextUrl !== previousUrl && history.replaceState) history.replaceState(null, '', nextUrl);
      localStorage.setItem(LS_LANG, lang);
      appliedLocale = lang;
    } catch (error) {
      snapshots.forEach(function (snapshot) {
        if (snapshot.update.kind === 'text') snapshot.update.element.textContent = snapshot.before;
        else snapshot.update.element.setAttribute(snapshot.update.kind === 'aria' ? 'aria-label' : 'alt', snapshot.before);
      });
      links.forEach(function (link) { link.element.setAttribute('href', link.before); });
      root.setAttribute('lang', previousLang);
      if (select) select.value = previousSelect;
      if (history.replaceState && location.pathname + location.search + location.hash !== previousUrl) {
        history.replaceState(null, '', previousUrl);
      }
      try {
        if (previousStored === null) localStorage.removeItem(LS_LANG);
        else localStorage.setItem(LS_LANG, previousStored);
      } catch (storageError) {}
      throw error;
    }
  }

  function requestLocale(lang, select) {
    var intent = ++latestIntent;
    var requested = isLocale(lang) ? lang : LANG_DEFAULT;
    if (select) select.value = appliedLocale;

    return loadBundle(requested).then(function (bundle) {
      if (intent !== latestIntent) return false;
      transactLocale(requested, bundle, select);
      releaseLocaleHold();
      return true;
    }).catch(function () {
      if (intent === latestIntent) {
        if (select) select.value = appliedLocale;
        releaseLocaleHold();
      }
      return false;
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

  function initLang() {
    var select = document.querySelector('[data-vex-lang-select]');
    if (!select) {
      releaseLocaleHold();
      return;
    }

    var options = Array.prototype.map.call(select.options, function (option) { return option.value; });
    if (options.length !== LANGS.length || LANGS.some(function (lang) { return options.indexOf(lang) === -1; })) {
      releaseLocaleHold();
      return;
    }
    Array.prototype.forEach.call(select.options, function (option) {
      option.textContent = LANG_NAMES[option.value];
    });

    select.value = appliedLocale;
    select.hidden = false;
    var label = document.querySelector('[data-vex-lang-label]');
    if (label) label.hidden = false;
    select.addEventListener('change', function () {
      var requested = select.value;
      select.value = appliedLocale;
      requestLocale(requested, select);
    });

    var initial = initialLocaleIntent();
    if (initial.invalidUrl || initial.locale === LANG_DEFAULT) {
      releaseLocaleHold();
      return;
    }
    requestLocale(initial.locale, select);
  }

  function mount() {
    initTheme();
    initLang();
  }

  installLocaleHold();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
}());

// [VXG RealForever]
