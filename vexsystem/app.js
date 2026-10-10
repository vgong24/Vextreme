/**
 * VEXTREME — vexsystem/app.js
 *
 * Browser renderer for the public VexSystem projection.
 * Semantic truth stays in data/vexsystem/atlas.json + lib/vexsystem/projection.js.
 * The default human surface is composed understanding; graph/lens controls are
 * optional deepening over the same selected subject.
 *
 * [VXG RealForever]
 */
(function () {
  'use strict';

  const projectionApi = window.VexSystemProjection;
  if (!projectionApi) throw new Error('VexSystemProjection is unavailable');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const HUMAN_LENS_LABELS = Object.freeze({
    BLUEPRINT: 'Structure',
    PROCESS: 'Building',
    CONSEQUENCE: 'Impact',
    PLATFORM: 'Platforms',
    FORMATION: 'History'
  });
  const FORMATION_STATE_LABELS = Object.freeze({
    HISTORICAL_ACCEPTED: 'Earlier accepted',
    HISTORICAL_NEGATIVE_EVIDENCE: 'What was learned',
    HISTORICAL_CORRECTION: 'Correction',
    CURRENT_ACCEPTED_CONVERGENCE: 'Current convergence'
  });

  const dom = {
    understandingPlacement: document.getElementById('understanding-placement'),
    understandingKind: document.getElementById('understanding-kind'),
    understandingState: document.getElementById('understanding-state'),
    understandingTitle: document.getElementById('understanding-title'),
    understandingPurpose: document.getElementById('understanding-purpose'),
    understandingStructure: document.getElementById('understanding-structure'),
    understandingRoutes: document.getElementById('understanding-routes'),
    understandingProof: document.getElementById('understanding-proof'),
    understandingFormationDetails: document.getElementById('understanding-formation-details'),
    understandingFormation: document.getElementById('understanding-formation'),
    understandingDescent: document.getElementById('understanding-descent'),
    lensControls: document.getElementById('lens-controls'),
    levelOut: document.getElementById('level-out'),
    levelIn: document.getElementById('level-in'),
    levelOutput: document.getElementById('level-output'),
    semanticBack: document.getElementById('semantic-back'),
    viewQuestion: document.getElementById('view-question'),
    viewMeta: document.getElementById('view-meta'),
    edgeLayer: document.getElementById('edge-layer'),
    nodeLayer: document.getElementById('node-layer'),
    mapStatus: document.getElementById('map-status'),
    inspectorHeading: document.getElementById('inspector-heading'),
    inspectorKind: document.getElementById('inspector-kind'),
    inspectorSummary: document.getElementById('inspector-summary'),
    inspectorState: document.getElementById('inspector-state'),
    inspectorSources: document.getElementById('inspector-sources'),
    lensPurpose: document.getElementById('lens-purpose'),
    textNodeList: document.getElementById('text-node-list')
  };

  let atlas = null;
  let state = null;

  function el(name, attrs, text) {
    const node = document.createElement(name);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === 'class') node.className = value;
      else node.setAttribute(key, value);
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function svgEl(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
    if (text != null) node.textContent = text;
    return node;
  }

  function currentLevelRecord() {
    return atlas.levels.find(item => item.level === state.level) || atlas.levels[0];
  }

  function currentLensRecord() {
    return atlas.lenses.find(item => item.lens === state.lens) || atlas.lenses[0];
  }

  function stateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const lens = params.get('lens');
    const level = params.get('level');

    const overrides = {};
    if (subject) overrides.selectedSubjectRef = subject;
    if (lens && projectionApi.LENSES.includes(lens)) overrides.lens = lens;
    if (level != null && level !== '') overrides.level = Number(level);

    try {
      return projectionApi.createState(atlas, overrides);
    } catch (_) {
      return projectionApi.createState(atlas);
    }
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('subject', state.selectedSubjectRef);
    url.searchParams.set('lens', state.lens);
    url.searchParams.set('level', String(state.level));
    window.history.replaceState(null, '', url);
  }

  function activateSubject(subjectRef) {
    state = projectionApi.focusSubject(atlas, state, subjectRef);
    render();
  }

  function relationPath(from, to) {
    const bend = Math.max(34, Math.abs(to.x - from.x) * 0.35);
    return [
      'M', from.x, from.y,
      'C', from.x + bend, from.y,
      to.x - bend, to.y,
      to.x, to.y
    ].join(' ');
  }

  function branchCss(branchClass) {
    return String(branchClass || 'PRIMARY').replace(/[^A-Z0-9_-]/g, '');
  }

  function sourceLink(ref, label) {
    const href = projectionApi.sourceHref(ref);
    if (!href) return null;
    return el('a', { href, target: '_blank', rel: 'noopener' }, label || ref);
  }

  function renderUnderstanding() {
    const understanding = projectionApi.composeUnderstanding(atlas, state.selectedSubjectRef);
    const subject = understanding.subject;

    dom.understandingKind.textContent = subject.kind;
    dom.understandingState.textContent = subject.state;
    dom.understandingTitle.textContent = subject.title;
    dom.understandingPurpose.textContent = subject.summary;

    dom.understandingPlacement.replaceChildren();
    const placement = [...understanding.placement, subject];
    placement.forEach((item, index) => {
      if (index > 0) dom.understandingPlacement.appendChild(el('span', { 'aria-hidden': 'true' }, '›'));
      const button = el('button', {
        type: 'button',
        class: 'vs-placement-node',
        'aria-current': String(item.subjectRef === subject.subjectRef)
      }, item.title);
      button.addEventListener('click', () => activateSubject(item.subjectRef));
      dom.understandingPlacement.appendChild(button);
    });

    dom.understandingStructure.replaceChildren();
    if (!understanding.currentStructure.length) {
      dom.understandingStructure.appendChild(el('p', { class: 'vs-empty-copy' }, 'No deeper current structure is registered at this public coordinate.'));
    } else {
      for (const item of understanding.currentStructure) {
        const card = el('article', { class: 'vs-structure-item' });
        card.appendChild(el('span', { class: 'vs-mini-meta' }, item.kind));
        card.appendChild(el('h3', {}, item.title));
        card.appendChild(el('p', {}, item.summary));
        dom.understandingStructure.appendChild(card);
      }
    }

    dom.understandingRoutes.replaceChildren();
    for (const item of understanding.routes) {
      const route = item.subject;
      const card = el('article', {
        class: 'vs-route-card' + (route.state === 'HELD' ? ' held' : ''),
        'data-route-state': route.state
      });
      const head = el('div', { class: 'vs-route-head' });
      head.appendChild(el('strong', {}, route.title));
      head.appendChild(el('span', { class: 'vs-route-state' }, route.state));
      card.appendChild(head);
      card.appendChild(el('p', {}, route.summary));
      dom.understandingRoutes.appendChild(card);
    }

    dom.understandingProof.replaceChildren();
    if (!understanding.proofs.length) {
      dom.understandingProof.appendChild(el('p', { class: 'vs-empty-copy' }, 'No public proof is attached at this coordinate.'));
    } else {
      for (const item of understanding.proofs) {
        const proof = item.subject;
        const card = el('article', { class: 'vs-proof-item' });
        card.appendChild(el('span', { class: 'vs-mini-meta' }, item.relation.type));
        card.appendChild(el('h3', {}, proof.title));
        card.appendChild(el('p', {}, proof.summary));
        const ref = [...proof.sourceRefs, ...proof.proofRefs].find(value => projectionApi.sourceHref(value));
        const link = ref ? sourceLink(ref, 'Open source / evidence ↗') : null;
        if (link) card.appendChild(link);
        dom.understandingProof.appendChild(card);
      }
    }

    dom.understandingFormation.replaceChildren();
    dom.understandingFormationDetails.hidden = understanding.formation.length === 0;
    for (const item of understanding.formation) {
      const row = el('li', { class: 'vs-formation-item' });
      row.appendChild(el('span', { class: 'vs-formation-state' }, FORMATION_STATE_LABELS[item.state] || item.state));
      row.appendChild(el('strong', {}, item.title));
      row.appendChild(el('p', {}, item.summary));
      dom.understandingFormation.appendChild(row);
    }

    dom.understandingDescent.replaceChildren();
    understanding.namedDescent.forEach((item, index) => {
      if (index > 0) dom.understandingDescent.appendChild(el('span', { 'aria-hidden': 'true' }, '→'));
      const button = el('button', {
        type: 'button',
        class: 'vs-descent-node',
        'aria-current': String(item.subjectRef === subject.subjectRef)
      }, item.title);
      button.addEventListener('click', () => activateSubject(item.subjectRef));
      dom.understandingDescent.appendChild(button);
    });
  }

  function renderLenses() {
    dom.lensControls.replaceChildren();
    for (const lensRecord of atlas.lenses) {
      const humanLabel = HUMAN_LENS_LABELS[lensRecord.lens] || lensRecord.label;
      const button = el('button', {
        type: 'button',
        'data-lens': lensRecord.lens,
        'aria-pressed': String(state.lens === lensRecord.lens),
        title: lensRecord.purpose
      }, humanLabel);
      button.addEventListener('click', () => {
        state = projectionApi.setLens(atlas, state, lensRecord.lens);
        render();
      });
      dom.lensControls.appendChild(button);
    }
  }

  function renderGraph(view) {
    dom.edgeLayer.replaceChildren();
    dom.nodeLayer.replaceChildren();

    const positions = projectionApi.layoutProjection(view, 1080, 620);

    for (const relation of view.relations) {
      const from = positions[relation.from];
      const to = positions[relation.to];
      if (!from || !to) continue;

      const path = svgEl('path', {
        class: 'vs-edge ' + branchCss(relation.branchClass),
        d: relationPath(from, to),
        'data-relation-ref': relation.relationRef
      });
      path.appendChild(svgEl('title', {}, relation.summary || relation.type));
      dom.edgeLayer.appendChild(path);
    }

    for (const subject of view.subjects) {
      const point = positions[subject.subjectRef];
      if (!point) continue;

      const group = svgEl('g', {
        class: [
          'vs-svg-node',
          point.selected ? 'selected' : '',
          subject.state === 'HELD' ? 'held' : ''
        ].filter(Boolean).join(' '),
        transform: `translate(${point.x - 82} ${point.y - 34})`,
        tabindex: '0',
        role: 'button',
        'aria-label': `${subject.title}. ${subject.kind}. ${subject.state}.`,
        'data-subject-ref': subject.subjectRef
      });

      group.appendChild(svgEl('rect', { width: '164', height: '68', rx: '12' }));
      group.appendChild(svgEl('text', { x: '12', y: '16', class: 'vs-node-kind' }, subject.kind));
      group.appendChild(svgEl('text', { x: '12', y: '36', class: 'vs-node-title' }, subject.title.length > 24 ? subject.title.slice(0, 23) + '…' : subject.title));
      group.appendChild(svgEl('text', { x: '12', y: '54', class: 'vs-node-state' }, subject.state));

      const activate = () => activateSubject(subject.subjectRef);
      group.addEventListener('click', activate);
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
      dom.nodeLayer.appendChild(group);
    }
  }

  function renderInspector(view) {
    const subject = view.selectedSubject;
    dom.inspectorHeading.textContent = subject.title;
    dom.inspectorKind.textContent = subject.kind;
    dom.inspectorSummary.textContent = subject.summary;
    dom.inspectorState.textContent = subject.state;
    dom.inspectorState.className = 'vs-state' + (subject.state === 'HELD' ? ' held' : '');

    dom.inspectorSources.replaceChildren();
    const refs = [...new Set([...(subject.sourceRefs || []), ...(subject.proofRefs || [])])];
    if (!refs.length) {
      dom.inspectorSources.appendChild(el('span', {}, 'No public descent attached at this level.'));
    } else {
      for (const ref of refs) {
        const link = sourceLink(ref);
        dom.inspectorSources.appendChild(link || el('span', {}, ref));
      }
    }

    dom.lensPurpose.textContent = currentLensRecord().purpose;
  }

  function renderTextView(view) {
    dom.textNodeList.replaceChildren();
    for (const subject of view.subjects) {
      const button = el('button', {
        type: 'button',
        class: 'vs-text-node',
        'data-subject-ref': subject.subjectRef,
        'aria-current': String(subject.subjectRef === state.selectedSubjectRef)
      });
      button.appendChild(el('strong', {}, subject.title));
      button.appendChild(el('span', {}, `${subject.kind} · ${subject.state}`));
      button.appendChild(el('small', {}, subject.summary));
      button.addEventListener('click', () => activateSubject(subject.subjectRef));
      dom.textNodeList.appendChild(button);
    }
  }

  function render() {
    const view = projectionApi.projectAtlas(atlas, state);
    const level = currentLevelRecord();

    renderUnderstanding();
    renderLenses();
    renderGraph(view);
    renderInspector(view);
    renderTextView(view);

    dom.levelOutput.textContent = level.name;
    dom.levelOut.disabled = state.level <= 0;
    dom.levelIn.disabled = state.level >= 5;
    dom.semanticBack.disabled = state.trail.length <= 1;
    dom.viewQuestion.textContent = level.question;
    dom.viewMeta.textContent = `${HUMAN_LENS_LABELS[state.lens] || currentLensRecord().label} · ${view.subjects.length} subjects · ${view.relations.length} typed relations`;
    dom.mapStatus.textContent = view.emptyLens
      ? 'No typed relation in this perspective at the current context; selected subject preserved.'
      : `Selected: ${view.selectedSubject.title}`;

    syncUrl();
  }

  dom.levelOut.addEventListener('click', () => {
    state = projectionApi.setLevel(atlas, state, state.level - 1);
    render();
  });
  dom.levelIn.addEventListener('click', () => {
    state = projectionApi.setLevel(atlas, state, state.level + 1);
    render();
  });
  dom.semanticBack.addEventListener('click', () => {
    state = projectionApi.returnFocus(atlas, state);
    render();
  });

  fetch('../data/vexsystem/atlas.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`atlas fetch failed: ${response.status}`);
      return response.json();
    })
    .then(value => {
      projectionApi.assertAtlas(value);
      atlas = value;
      state = stateFromUrl();
      render();
    })
    .catch(error => {
      dom.understandingKind.textContent = 'UNAVAILABLE';
      dom.understandingState.textContent = '';
      dom.understandingTitle.textContent = 'VexSystem source could not be loaded.';
      dom.understandingPurpose.textContent = 'The public projection fails closed rather than inventing architecture.';
      dom.mapStatus.textContent = 'VexSystem source could not be loaded.';
      dom.viewQuestion.textContent = 'The public projection is unavailable.';
      dom.viewMeta.textContent = error.message;
      dom.inspectorHeading.textContent = 'Unavailable';
      dom.inspectorSummary.textContent = 'The explorer fails closed rather than inventing architecture.';
    });
}());
