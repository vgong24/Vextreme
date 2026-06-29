/**
 * VEXTREME ARC NAV — lib/arc-nav.js
 *
 * The rendering engine. Consumes window.VEXTREME_ARCS (loaded from arcs.json)
 * and produces the arc navigation widget HTML.
 *
 * RESPONSIBILITIES:
 *   - Slug resolution    : map a URL or slug string to an arc entry
 *   - Arc resolution     : given a page slug, find all arcs it belongs to
 *   - Rendering          : build dot-row or position-only HTML per arc
 *   - Mounting           : inject the full widget into #arcNavMount
 *
 * NOT RESPONSIBLE FOR:
 *   - Arc data           : lives in data/arcs.json → window.VEXTREME_ARCS
 *   - CSS                : lives in styles/arc-nav.css
 *   - Page-level config  : PAGE_ARCS is defined per-page, consumed here
 *
 * USAGE (per-page, after both this script and arcs.json are loaded):
 *   <div id="arcNavMount"></div>
 *   <script>
 *     // Option A — auto-resolve from slug (recommended):
 *     const PAGE_ARCS = [{ slug: 'claude-answers-the-doubt' }];
 *
 *     // Option B — explicit arc + position (override when needed):
 *     const PAGE_ARCS = [
 *       { arcId: 'epstein', current: 9 },
 *       { arcId: 'claude_journals', current: 1 }
 *     ];
 *
 *     window.VEXTREME_mount && window.VEXTREME_mount();
 *   </script>
 *
 * BASE URL:
 *   Set window.VEXTREME_BASE_URL before loading this script if your domain
 *   differs from the default. Defaults to 'https://www.vextreme24.com'.
 */

(function (global) {
  'use strict';

  var BASE_URL = global.VEXTREME_BASE_URL || 'https://www.vextreme24.com';

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /**
   * Extract the slug from a full URL or return the value as-is if already a slug.
   * e.g. 'https://www.vextreme24.com/i-was-here' → 'i-was-here'
   */
  function slugFromUrl(url) {
    return url.replace(/\/$/, '').split('/').pop();
  }

  /**
   * Build a full URL from a slug.
   */
  function urlFromSlug(slug) {
    return BASE_URL + '/' + slug;
  }

  /**
   * Flatten all entries across all sections of an arc into a single array.
   */
  function flatEntries(arc) {
    return arc.sections.reduce(function (acc, section) {
      return acc.concat(section.entries);
    }, []);
  }

  /**
   * Find the index of an entry in a flat array by slug or by n (number).
   */
  function findEntryIndex(entries, current) {
    if (typeof current === 'number') {
      return entries.findIndex(function (e) { return e.n === current; });
    }
    return entries.findIndex(function (e) {
      return (e.slug || slugFromUrl(e.url || '')) === current;
    });
  }

  /**
   * Find which section an entry belongs to within an arc.
   */
  function findSection(arc, current) {
    return arc.sections.find(function (s) {
      return s.entries.some(function (e) {
        if (typeof current === 'number') return e.n === current;
        return (e.slug || slugFromUrl(e.url || '')) === current;
      });
    });
  }


  // ─────────────────────────────────────────────
  // RENDER: DOT ROW
  // ─────────────────────────────────────────────

  function buildDotsHTML(arc, currentIdx) {
    var html = '';
    var flatIdx = 0;

    arc.sections.forEach(function (section, si) {
      if (si > 0) html += '<div class="arc-section-gap"></div>';

      section.entries.forEach(function (entry, ei) {
        var isActive = flatIdx === currentIdx;
        var isPast   = flatIdx < currentIdx;
        var slug     = entry.slug || slugFromUrl(entry.url || '');
        var href     = urlFromSlug(slug);
        var label    = (flatIdx + 1) + '. ' + entry.title;

        var dotClass = isActive ? 'arc-dot active' : isPast ? 'arc-dot visited' : 'arc-dot';
        var conClass = isPast ? 'arc-connector passed' : 'arc-connector';

        html += '<div class="arc-dot-wrap">';
        html += '<a class="' + dotClass + '" href="' + href + '" title="' + label + '" aria-label="' + entry.title + '"></a>';
        if (ei < section.entries.length - 1) {
          html += '<div class="' + conClass + '"></div>';
        }
        html += '</div>';
        flatIdx++;
      });
    });

    return html;
  }


  // ─────────────────────────────────────────────
  // RENDER: SINGLE ARC ROW
  // ─────────────────────────────────────────────

  /**
   * Render one arc row (dot nav or position-only).
   *
   * @param  {string}        arcId   — key in window.VEXTREME_ARCS
   * @param  {string|number} current — slug string or entry n
   * @return {string}                — HTML string
   */
  function renderArcRow(arcId, current) {
    var ARCS = global.VEXTREME_ARCS;
    var arc  = ARCS && ARCS[arcId];

    if (!arc) {
      return '<div style="font-family:monospace;font-size:11px;color:#b45830;padding:8px 0;">Arc "' + arcId + '" not found.</div>';
    }

    var all        = flatEntries(arc);
    var total      = all.length;
    var currentIdx = findEntryIndex(all, current);

    if (currentIdx === -1) {
      return '<div style="font-family:monospace;font-size:11px;color:#b45830;padding:8px 0;">Entry "' + current + '" not found in arc "' + arcId + '".</div>';
    }

    var prev     = currentIdx > 0           ? all[currentIdx - 1] : null;
    var next     = currentIdx < total - 1   ? all[currentIdx + 1] : null;
    var position = currentIdx + 1;
    var section  = findSection(arc, current);

    var parentHref  = arc.parent.url;
    var parentTitle = arc.parent.title;
    var sectionLabel = section ? section.label : '';

    var prevHref = prev ? urlFromSlug(prev.slug || slugFromUrl(prev.url || '')) : '#';
    var nextHref = next ? urlFromSlug(next.slug || slugFromUrl(next.url || '')) : '#';

    // ── POSITION-ONLY render mode (full_timeline) ──
    if (arc.renderMode === 'position') {
      return '<div class="arc-nav-row arc-nav-row--position">'
        + '<div class="arc-nav-header">'
        + '<span class="arc-nav-title">'
        + '<a class="arc-nav-parent-link" href="' + parentHref + '">' + parentTitle + '</a>'
        + '</span>'
        + '<div class="arc-nav-row-right">'
        + '<span class="arc-nav-position">' + position + ' / ' + total + '</span>'
        + '<a class="arc-nav-arrow' + (prev ? '' : ' disabled') + '" href="' + prevHref + '">←</a>'
        + '<a class="arc-nav-arrow' + (next ? '' : ' disabled') + '" href="' + nextHref + '">→</a>'
        + '</div>'
        + '</div>'
        + '</div>';
    }

    // ── DOT ROW render mode (default) ──
    var dotsHTML = buildDotsHTML(arc, currentIdx);

    return '<div class="arc-nav-row">'
      + '<div class="arc-nav-header">'
      + '<span class="arc-nav-title">'
      + '<a class="arc-nav-parent-link" href="' + parentHref + '">' + parentTitle + '</a>'
      + '  ·  ' + sectionLabel
      + '</span>'
      + '<div class="arc-nav-row-right">'
      + '<span class="arc-nav-position">' + position + ' / ' + total + '</span>'
      + '<a class="arc-nav-arrow' + (prev ? '' : ' disabled') + '" href="' + prevHref + '">←</a>'
      + '<a class="arc-nav-arrow' + (next ? '' : ' disabled') + '" href="' + nextHref + '">→</a>'
      + '</div>'
      + '</div>'
      + '<div class="arc-nav-dots">' + dotsHTML + '</div>'
      + '</div>';
  }


  // ─────────────────────────────────────────────
  // ARC RESOLUTION
  // Separate from rendering — finds which arcs a slug belongs to.
  // ─────────────────────────────────────────────

  /**
   * Given a slug, return all arcs that contain it, sorted by priority.
   * Dot arcs come before position arcs (full_timeline last).
   *
   * @param  {string} slug
   * @return {Array}  — [{ arcId, current }]
   */
  function resolveArcsForSlug(slug) {
    var ARCS      = global.VEXTREME_ARCS;
    var dotArcs   = [];
    var posArcs   = [];

    Object.keys(ARCS).forEach(function (arcId) {
      var arc     = ARCS[arcId];
      var entries = flatEntries(arc);
      var match   = entries.some(function (e) {
        return (e.slug || slugFromUrl(e.url || '')) === slug;
      });

      if (match) {
        var entry = { arcId: arcId, current: slug };
        if (arc.renderMode === 'position') {
          posArcs.push(entry);
        } else {
          dotArcs.push(entry);
        }
      }
    });

    // Combine: dot arcs first, then position arcs
    var combined = dotArcs.concat(posArcs);

    // Sort by arc priority within each group
    combined.sort(function (a, b) {
      var pa = (ARCS[a.arcId] && ARCS[a.arcId].priority) || 2;
      var pb = (ARCS[b.arcId] && ARCS[b.arcId].priority) || 2;
      return pa - pb;
    });

    return combined;
  }


  // ─────────────────────────────────────────────
  // MOUNT
  // ─────────────────────────────────────────────

  /**
   * Main entry point. Reads PAGE_ARCS, resolves arcs, renders widget
   * into #arcNavMount.
   *
   * PAGE_ARCS shapes accepted:
   *   [{ slug: 'some-page-slug' }]            — auto-resolve all arcs
   *   [{ arcId: 'epstein', current: 9 }]      — explicit arc + position
   */
  function mount() {
    var el = document.getElementById('arcNavMount');
    if (!el) return;

    var PAGE_ARCS = global.PAGE_ARCS;
    if (!PAGE_ARCS || !PAGE_ARCS.length) return;

    var ARCS = global.VEXTREME_ARCS;
    if (!ARCS) {
      el.innerHTML = '<div style="font-family:monospace;font-size:11px;color:#b45830;padding:8px 0;">VEXTREME_ARCS not loaded.</div>';
      return;
    }

    // Resolve arc list
    var resolvedArcs;
    if (PAGE_ARCS.length === 1 && PAGE_ARCS[0].slug && !PAGE_ARCS[0].arcId) {
      resolvedArcs = resolveArcsForSlug(PAGE_ARCS[0].slug);
    } else {
      resolvedArcs = PAGE_ARCS;
    }

    if (!resolvedArcs.length) {
      el.innerHTML = '<div style="font-family:monospace;font-size:11px;color:#b45830;padding:8px 0;">No arcs found for this page.</div>';
      return;
    }

    // Resolve current page title from first dot arc
    var firstResolved = resolvedArcs[0];
    var firstArc      = ARCS[firstResolved.arcId];
    var firstAll      = firstArc ? flatEntries(firstArc) : [];
    var currentSlug   = firstResolved.current;
    var currentEntry  = firstAll.find(function (e) {
      if (typeof currentSlug === 'number') return e.n === currentSlug;
      return (e.slug || slugFromUrl(e.url || '')) === currentSlug;
    });
    var pageTitle = currentEntry ? currentEntry.title : '';

    // Build rows HTML
    var rowsHTML = resolvedArcs.map(function (a) {
      return renderArcRow(a.arcId, a.current);
    }).join('');

    // Build "You are here" footer
    var footerHTML = '<div class="arc-nav-current">'
      + '<div class="arc-nav-current-label">You are here</div>'
      + '<div class="arc-nav-current-title">' + pageTitle + '</div>'
      + '</div>';

    el.innerHTML = '<div class="arc-nav">' + rowsHTML + footerHTML + '</div>';
  }


  // ─────────────────────────────────────────────
  // EXPORTS — attach to global for Squarespace compat
  // ─────────────────────────────────────────────

  global.VEXTREME_slugFromUrl  = slugFromUrl;
  global.VEXTREME_renderArcRow = renderArcRow;
  global.VEXTREME_resolveArcs  = resolveArcsForSlug;
  global.VEXTREME_mount        = mount;

  // Auto-mount on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', mount);

}(window));
