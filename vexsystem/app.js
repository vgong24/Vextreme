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
  const MAP_WIDTH = 1080;
  const MAP_HEIGHT = 620;
  const MAP_MIN_SCALE = 0.55;
  const MAP_MAX_SCALE = 2.8;
  const HUMAN_LEVEL_LABELS = Object.freeze({ 0: 'Whole', 1: 'System', 2: 'Foundation', 3: 'Current thing', 4: 'How it works', 5: 'Source / proof' });
  const FORMATION_STATE_LABELS = Object.freeze({
    HISTORICAL_ACCEPTED: 'Earlier accepted',
    HISTORICAL_NEGATIVE_EVIDENCE: 'What was learned',
    HISTORICAL_CORRECTION: 'Correction',
    CURRENT_ACCEPTED_CONVERGENCE: 'Current convergence'
  });

  // GitHub Pages is controlled by Vextreme's site-wide service worker, which
  // caches non-HTML requests by URL. Bind mutable VexSystem data to the exact
  // Git blob identity so an older cached atlas cannot cross generations with
  // the current renderer.
  const VEXSYSTEM_ATLAS_BLOB = 'c7694c6c0b7f97c3fe95abfeb9cc5f28fc0b3b5b';
  const VEXSYSTEM_ATLAS_URL = `../data/vexsystem/atlas.json?v=${VEXSYSTEM_ATLAS_BLOB}`;

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
    questionControls: document.getElementById('question-controls'),
    levelOut: document.getElementById('level-out'),
    levelIn: document.getElementById('level-in'),
    levelOutput: document.getElementById('level-output'),
    semanticBack: document.getElementById('semantic-back'),
    viewQuestion: document.getElementById('view-question'),
    viewAnswer: document.getElementById('view-answer'),
    viewMeta: document.getElementById('view-meta'),
    mapSvg: document.getElementById('vexsystem-map'),
    mapWorld: document.getElementById('map-world'),
    mapFit: document.getElementById('map-fit'),
    mapZoomOut: document.getElementById('map-zoom-out'),
    mapZoomIn: document.getElementById('map-zoom-in'),
    mapReset: document.getElementById('map-reset'),
    edgeLayer: document.getElementById('edge-layer'),
    nodeLayer: document.getElementById('node-layer'),
    mapStatus: document.getElementById('map-status'),
    inspectorHeading: document.getElementById('inspector-heading'),
    inspectorKind: document.getElementById('inspector-kind'),
    inspectorSummary: document.getElementById('inspector-summary'),
    inspectorState: document.getElementById('inspector-state'),
    inspectorSources: document.getElementById('inspector-sources'),
    questionPurpose: document.getElementById('question-purpose'),
    textNodeList: document.getElementById('text-node-list')
  };

  let atlas = null;
  let state = null;
  let questionRef = projectionApi.DEFAULT_HUMAN_QUESTION;
  let mapView = { x: 0, y: 0, scale: 1 };
  let lastMapContext = null;
  let mapDrag = null;
  let suppressSubjectClick = null;

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
    const requestedQuestion = params.get('question');
    const legacyLens = params.get('lens');
    const level = params.get('level');

    if (requestedQuestion && projectionApi.HUMAN_QUESTION_REFS.includes(requestedQuestion)) questionRef = requestedQuestion;
    else questionRef = projectionApi.questionForLens(legacyLens || atlas.defaultLens).questionRef;

    const question = projectionApi.humanQuestionRecord(questionRef);
    const overrides = { lens: question.primaryLens };
    if (subject) overrides.selectedSubjectRef = subject;
    if (level != null && level !== '') overrides.level = Number(level);

    try { return projectionApi.createState(atlas, overrides); }
    catch (_) {
      questionRef = projectionApi.DEFAULT_HUMAN_QUESTION;
      return projectionApi.createState(atlas, { lens: projectionApi.humanQuestionRecord(questionRef).primaryLens });
    }
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('subject', state.selectedSubjectRef);
    url.searchParams.set('question', questionRef);
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

  function renderQuestions() {
    dom.questionControls.replaceChildren();
    for (const question of projectionApi.HUMAN_QUESTIONS) {
      const button = el('button', {
        type: 'button',
        'data-question': question.questionRef,
        'aria-pressed': String(questionRef === question.questionRef),
        title: question.explanation
      }, question.prompt);
      button.addEventListener('click', () => {
        questionRef = question.questionRef;
        state = projectionApi.setLens(atlas, state, question.primaryLens);
        render();
      });
      dom.questionControls.appendChild(button);
    }
  }

  function mapNumber(value) { return Math.round(value * 1000) / 1000; }
  function applyMapTransform() {
    mapView = { x: mapNumber(mapView.x), y: mapNumber(mapView.y), scale: mapNumber(mapView.scale) };
    dom.mapWorld.setAttribute('transform', `matrix(${mapView.scale} 0 0 ${mapView.scale} ${mapView.x} ${mapView.y})`);
  }
  function resetMapView() { mapView = { x: 0, y: 0, scale: 1 }; applyMapTransform(); }
  function clientToMap(clientX, clientY) {
    const rect = dom.mapSvg.getBoundingClientRect();
    return { x: (clientX - rect.left) * MAP_WIDTH / Math.max(1, rect.width), y: (clientY - rect.top) * MAP_HEIGHT / Math.max(1, rect.height) };
  }
  function zoomMapAt(point, requestedScale) {
    const nextScale = Math.max(MAP_MIN_SCALE, Math.min(MAP_MAX_SCALE, requestedScale));
    const worldX = (point.x - mapView.x) / mapView.scale;
    const worldY = (point.y - mapView.y) / mapView.scale;
    mapView = { x: point.x - worldX * nextScale, y: point.y - worldY * nextScale, scale: nextScale };
    applyMapTransform();
  }
  function fitMapToQuestion(positions, supportSubjectRefs) {
    const points = supportSubjectRefs.map(ref => positions[ref]).filter(Boolean);
    if (!points.length) { resetMapView(); return; }
    const minX = Math.min(...points.map(point => point.x)) - 120;
    const maxX = Math.max(...points.map(point => point.x)) + 120;
    const minY = Math.min(...points.map(point => point.y)) - 78;
    const maxY = Math.max(...points.map(point => point.y)) + 78;
    const width = Math.max(220, maxX - minX);
    const height = Math.max(150, maxY - minY);
    const scale = Math.max(MAP_MIN_SCALE, Math.min(1.7, 0.88 * Math.min(MAP_WIDTH / width, MAP_HEIGHT / height)));
    mapView = { x: MAP_WIDTH / 2 - ((minX + maxX) / 2) * scale, y: MAP_HEIGHT / 2 - ((minY + maxY) / 2) * scale, scale };
    applyMapTransform();
  }
  function fitCurrentQuestion() {
    if (lastMapContext) fitMapToQuestion(lastMapContext.positions, lastMapContext.supportSubjectRefs);
  }

  function renderGraph(view, question) {
    dom.edgeLayer.replaceChildren();
    dom.nodeLayer.replaceChildren();

    const positions = projectionApi.layoutProjection(view, MAP_WIDTH, MAP_HEIGHT);

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
      group.addEventListener('click', () => {
        if (suppressSubjectClick === subject.subjectRef) { suppressSubjectClick = null; return; }
        activate();
      });
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
      dom.nodeLayer.appendChild(group);
    }
    lastMapContext = { positions, supportSubjectRefs: [...question.supportSubjectRefs] };
    fitCurrentQuestion();
  }

  function renderInspector(view, question) {
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

    dom.questionPurpose.textContent = question.explanation;
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
    const question = projectionApi.composeHumanQuestion(atlas, state.selectedSubjectRef, questionRef);
    const view = projectionApi.projectAtlasForQuestion(atlas, state, questionRef);

    renderUnderstanding();
    renderQuestions();
    renderGraph(view, question);
    renderInspector(view, question);
    renderTextView(view);

    dom.levelOutput.textContent = HUMAN_LEVEL_LABELS[state.level] || currentLevelRecord().name;
    dom.levelOut.disabled = state.level <= 0;
    dom.levelIn.disabled = state.level >= 5;
    dom.semanticBack.disabled = state.trail.length <= 1;
    dom.viewQuestion.textContent = question.prompt;
    dom.viewAnswer.textContent = question.answer;
    dom.viewMeta.textContent = question.supported
      ? `${view.subjects.length} related things · ${view.relations.length} connections`
      : 'Not enough accepted evidence to answer this fully yet.';
    dom.mapStatus.textContent = `Selected: ${view.selectedSubject.title} · drag to move · scroll to zoom`;
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

  dom.mapSvg.addEventListener('wheel', event => {
    event.preventDefault();
    zoomMapAt(clientToMap(event.clientX, event.clientY), mapView.scale * Math.pow(1.0015, -event.deltaY));
  }, { passive: false });
  dom.mapSvg.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const subjectNode = event.target.closest ? event.target.closest('[data-subject-ref]') : null;
    mapDrag = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY, startX: event.clientX, startY: event.clientY, startSubjectRef: subjectNode ? subjectNode.getAttribute('data-subject-ref') : null, moved: false };
    if (dom.mapSvg.setPointerCapture) dom.mapSvg.setPointerCapture(event.pointerId);
    dom.mapSvg.classList.add('grabbing');
    event.preventDefault();
  });
  dom.mapSvg.addEventListener('pointermove', event => {
    if (!mapDrag || mapDrag.pointerId !== event.pointerId) return;
    const rect = dom.mapSvg.getBoundingClientRect();
    mapView.x += (event.clientX - mapDrag.lastX) * MAP_WIDTH / Math.max(1, rect.width);
    mapView.y += (event.clientY - mapDrag.lastY) * MAP_HEIGHT / Math.max(1, rect.height);
    if (Math.hypot(event.clientX - mapDrag.startX, event.clientY - mapDrag.startY) > 4) mapDrag.moved = true;
    mapDrag.lastX = event.clientX;
    mapDrag.lastY = event.clientY;
    applyMapTransform();
    event.preventDefault();
  });
  function endMapDrag(event) {
    if (!mapDrag || mapDrag.pointerId !== event.pointerId) return;
    const completed = mapDrag;
    const activateRef = event.type === 'pointerup' && !completed.moved
      ? completed.startSubjectRef
      : null;

    if (completed.moved && completed.startSubjectRef) suppressSubjectClick = completed.startSubjectRef;
    if (dom.mapSvg.releasePointerCapture) dom.mapSvg.releasePointerCapture(event.pointerId);
    dom.mapSvg.classList.remove('grabbing');
    mapDrag = null;

    if (activateRef) {
      // Pointer capture is required for stable panning, but it can retarget the
      // later click away from the original SVG node. Treat a completed no-drag
      // pointer gesture as the semantic activation, then suppress only the
      // immediate compatibility click if the browser still emits it at the node.
      suppressSubjectClick = activateRef;
      activateSubject(activateRef);
      setTimeout(() => {
        if (suppressSubjectClick === activateRef) suppressSubjectClick = null;
      }, 0);
    }
  }
  dom.mapSvg.addEventListener('pointerup', endMapDrag);
  dom.mapSvg.addEventListener('pointercancel', endMapDrag);
  dom.mapZoomIn.addEventListener('click', () => zoomMapAt({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }, mapView.scale * 1.25));
  dom.mapZoomOut.addEventListener('click', () => zoomMapAt({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }, mapView.scale * 0.8));
  dom.mapFit.addEventListener('click', fitCurrentQuestion);
  dom.mapReset.addEventListener('click', resetMapView);

  fetch(VEXSYSTEM_ATLAS_URL, { cache: 'no-store' })
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
      dom.viewAnswer.textContent = 'We cannot answer this question from unavailable source truth.';
      dom.viewMeta.textContent = error.message;
      dom.inspectorHeading.textContent = 'Unavailable';
      dom.inspectorSummary.textContent = 'The explorer fails closed rather than inventing architecture.';
    });
}());
