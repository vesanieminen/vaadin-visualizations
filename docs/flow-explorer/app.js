/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  const data = window.FLOW_CONTENT;
  const snapshot = window.FLOW_SNAPSHOT;
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
    );
  const state = {
    view: 'story',
    scene: 'click',
    step: 0,
    lens: 'concepts',
    selected: null,
    tab: 'explanation',
    playing: false,
    speed: 1,
    category: 'All',
    query: '',
    module: null,
    source: null,
    matches: [],
    matchIndex: 0
  };
  const slots = [
    [4, 22],
    [4, 56],
    [59, 14],
    [59, 35],
    [59, 56],
    [59, 77]
  ];
  let timer;
  let toastTimer;
  let resizeObserver;

  function getScene() {
    return data.scenes.find((scene) => scene.id === state.scene);
  }
  function getSourceUrl(key) {
    const source = snapshot.sources[key];
    return `${snapshot.repo}/blob/${snapshot.commit}/${source.path}#L${source.line}`;
  }
  function getModuleUrl(id) {
    return `${snapshot.repo}/tree/${snapshot.commit}/${id}`;
  }
  function showToast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
  }
  function highlightCode(code) {
    const tokens =
      /(\/\/[^\n]*|\/\*[^\n]*|^\s*\*[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(public|private|protected|class|interface|return|void|new|if|else|const|let|function|export|import|from|extends|implements|static|final|boolean|int|try|finally|throw|for|while|this|super|true|false|null|default|package)\b|\b(\d+)\b/g;
    let result = '',
      cursor = 0;
    for (const match of code.matchAll(tokens)) {
      result += escapeHtml(code.slice(cursor, match.index));
      const type = match[1] ? 'comment' : match[2] ? 'string' : match[3] ? 'keyword' : 'number';
      result += `<span class="token-${type}">${escapeHtml(match[0])}</span>`;
      cursor = match.index + match[0].length;
    }
    return result + escapeHtml(code.slice(cursor));
  }
  function renderNavigation() {
    $('#navigation').innerHTML =
      `<div class="nav-group">FOLLOW THE FLOW</div>${data.scenes.map((scene, i) => `<a href="#story/${scene.id}" class="nav-item ${['story', 'inside'].includes(state.view) && state.scene === scene.id ? 'active' : ''}" ${['story', 'inside'].includes(state.view) && state.scene === scene.id ? 'aria-current="page"' : ''}><span class="nav-num">0${i + 1}</span>${scene.short}<span class="arrow">↗</span></a>`).join('')}<div class="nav-group">GO A LEVEL DEEPER</div>${[
        ['world', '◉', '3D runtime lab'],
        ['modules', '⊞', 'Repository map'],
        ['atlas', '◈', 'Dependency atlas'],
        ['guide', '◇', 'Concept field guide'],
        ['sources', '⌘', 'Source reader']
      ]
        .map(
          ([id, icon, title]) =>
            `<a href="#${id}" class="nav-item ${state.view === id ? 'active' : ''}" ${state.view === id ? 'aria-current="page"' : ''}><span class="nav-num">${icon}</span>${title}<span class="arrow">↗</span></a>`
        )
        .join('')}`;
    $('#page-label').textContent = {
      story: 'Runtime stories',
      world: '3D runtime lab',
      modules: 'Repository map',
      atlas: 'Dependency atlas',
      inside: 'Inside the concept',
      guide: 'Concept field guide',
      sources: 'Source reader'
    }[state.view];
  }
  function renderSourceLink(key) {
    const source = snapshot.sources[key];
    return `<button class="source-link" data-source="${key}"><span>FOLLOW IT INTO THE SOURCE ↗</span>${escapeHtml(source.name)}:${source.line}<br><small>${source.module}</small></button>`;
  }
  function renderInspector() {
    const scene = getScene();
    const current = scene.steps[state.step];
    const selectedNode = scene.nodes.find((node) => node.id === state.selected);
    const isCurrent = !selectedNode || selectedNode.id === current.node;
    const selectedStep = isCurrent ? current : scene.steps.find((step) => step.node === selectedNode.id);
    const key = selectedStep?.source || selectedNode.source;
    const source = snapshot.sources[key];
    const nodeId = selectedNode?.id || current.node;
    let content;
    if (state.tab === 'inside') {
      content = window.FLOW_INTERNALS.preview(scene.id, nodeId, state.step, state.lens);
    } else if (state.tab === 'source') {
      const lines = snapshot.files[source.path].split('\n').slice(source.line - 1, source.end);
      content = `<div class="step-kicker">${escapeHtml(source.module)}</div><h3>${escapeHtml(source.name)}</h3><p class="source-intro">Actual source at <code>${snapshot.commit.slice(0, 10)}</code>. Open the file to read the surrounding implementation.</p><div class="source-preview" tabindex="0" aria-label="Source excerpt">${lines.map((line, i) => `<span class="preview-line"><span class="ln">${source.line + i}</span>${highlightCode(line)}</span>`).join('')}</div>${renderSourceLink(key)}`;
    } else {
      content = `<div class="step-kicker">${isCurrent ? `STEP ${String(state.step + 1).padStart(2, '0')} / ${String(scene.steps.length).padStart(2, '0')}` : 'EXPLORING A COMPONENT'}</div><h3>${escapeHtml(selectedStep?.title || selectedNode.title)}</h3><p class="explanation">${escapeHtml(selectedStep?.body || selectedNode.subtitle)}</p><div class="detail-label">${state.lens === 'classes' ? 'INSIDE THE IMPLEMENTATION' : 'ONE LEVEL DEEPER'}</div><p class="detail">${escapeHtml(selectedStep?.detail || 'This component participates in the shared Flow synchronization machinery. Explore its source to see its full contract.')}</p>${renderSourceLink(key)}`;
    }
    if (state.tab === 'explanation')
      content += `<a class="inside-teaser" href="${window.FLOW_INTERNALS.link(scene.id, nodeId, 0, state.step, state.lens)}">Inside this concept: objects, execution & packages →</a>`;
    return `<div class="inspector-tabs" role="group" aria-label="Inspector content"><button id="explanation-tab" class="${state.tab === 'explanation' ? 'active' : ''}" data-tab="explanation" aria-pressed="${state.tab === 'explanation'}">Explanation</button><button id="inside-tab" class="${state.tab === 'inside' ? 'active' : ''}" data-tab="inside" aria-pressed="${state.tab === 'inside'}">Inside</button><button id="source-tab" class="${state.tab === 'source' ? 'active' : ''}" data-tab="source" aria-pressed="${state.tab === 'source'}">Source code ↗</button></div><div class="inspector-content" aria-live="${state.playing ? 'off' : 'polite'}">${content}</div>`;
  }
  function renderStory() {
    resizeObserver?.disconnect();
    const focused = document.activeElement?.id;
    const scene = getScene();
    const current = scene.steps[state.step];
    const index = data.scenes.indexOf(scene);
    const finished = state.step === scene.steps.length - 1;
    $('#main').innerHTML =
      `<section class="hero"><div class="hero-copy"><span class="eyebrow">${scene.eyebrow}</span><h1>${scene.title.split('\n').map(escapeHtml).join('<br>')}</h1><p>${scene.intro}</p></div><div class="story-count"><strong>0${index + 1}</strong> / 06</div></section>
      <section class="explorer" aria-label="Interactive ${scene.short.toLowerCase()} visualization">
        <div class="explorer-toolbar"><div class="explorer-label"><span class="tiny-dot"></span> ${scene.short}<span class="simulation-label">INTERACTIVE MODEL · NOT LIVE TELEMETRY</span></div><div class="segmented" role="group" aria-label="Level of detail"><button id="concepts-lens" class="${state.lens === 'concepts' ? 'active' : ''}" data-lens="concepts" aria-pressed="${state.lens === 'concepts'}">Concepts</button><button id="classes-lens" class="${state.lens === 'classes' ? 'active' : ''}" data-lens="classes" aria-pressed="${state.lens === 'classes'}">Classes</button></div></div>
        <div class="explorer-body"><div class="map-column"><div class="map-scroll" tabindex="0" aria-label="Architecture map; scroll horizontally on small screens"><div class="map ${state.playing ? 'is-playing' : ''}" id="flow-map"><div class="map-lane browser"><span class="lane-title">${scene.lanes[0]}</span></div><div class="map-lane server"><span class="lane-title">${scene.lanes[1]}</span></div><svg id="connections" aria-hidden="true"></svg>${scene.nodes.map((node) => `<button id="node-${node.id}" data-node="${node.id}" style="--x:${slots[node.slot][0]}%;--y:${slots[node.slot][1]}%" class="flow-node ${current.node === node.id ? 'is-active' : ''} ${state.selected === node.id ? 'is-selected' : ''}" aria-pressed="${(state.selected || current.node) === node.id}"><span class="node-top">${node.slot < 2 ? (scene.id === 'build' ? 'APPLICATION' : 'CLIENT') : scene.id === 'build' ? 'BUILD' : 'SERVER'}<span class="node-status"></span></span><span class="node-title">${escapeHtml(state.lens === 'classes' ? node.symbol : node.title)}</span><span class="node-subtitle">${escapeHtml(node.subtitle)}</span></button>`).join('')}${scene.id === 'click' ? `<div class="live-demo"><p>TRY THE ROUND TRIP<br><span class="demo-result">${finished ? 'Clicked!' : 'Ready when you are'}</span></p><button class="demo-button" id="demo-click" aria-label="Simulate a click and play the journey">Click me ↗</button></div>` : ''}<div class="map-hint"><span></span> ${state.playing ? 'Following the highlighted path' : 'Select any node to look inside'} · Simplified teaching model</div></div></div><div class="wire-strip"><span class="wire-label">AT THIS STEP<br>ILLUSTRATIVE</span><code>${escapeHtml(current.packet)}</code></div></div><aside class="inspector" aria-label="Step explanation and source">${renderInspector()}</aside></div>
        <div class="playback"><button id="play" class="play-button" aria-label="${state.playing ? 'Pause journey' : finished ? 'Replay journey' : 'Play journey'}">${state.playing ? 'Ⅱ Pause' : finished ? '↻ Replay' : '▶ Play journey'}</button><button id="previous" class="icon-button" aria-label="Previous step" ${state.step === 0 ? 'disabled' : ''}>‹</button><button id="next" class="icon-button" aria-label="Next step" ${finished ? 'disabled' : ''}>›</button><div class="steps" role="group" aria-label="Journey steps">${scene.steps.map((step, i) => `${i ? '<span class="step-line"></span>' : ''}<button id="step-${i}" data-step="${i}" class="step-dot ${i < state.step ? 'done' : ''} ${i === state.step ? 'active' : ''}" aria-label="Step ${i + 1}: ${escapeHtml(step.title)}" ${i === state.step ? 'aria-current="step"' : ''}>${i < state.step ? '✓' : i + 1}</button>`).join('')}</div><span class="step-fraction">${state.step + 1} / ${scene.steps.length}</span><label class="sr-only" for="speed">Playback speed</label><select id="speed" class="speed-select">${[
          [0.5, '0.5×'],
          [1, '1×'],
          [2, '2×']
        ]
          .map(
            ([value, label]) => `<option value="${value}" ${state.speed === value ? 'selected' : ''}>${label}</option>`
          )
          .join('')}</select></div>
      </section><div class="takeaway"><span class="takeaway-icon" aria-hidden="true">◇</span><div><h3>THE IDEA TO KEEP</h3><p>${scene.takeaway}</p></div><a class="next-story" href="${index < data.scenes.length - 1 ? '#story/' + data.scenes[index + 1].id : '#modules'}">${index < data.scenes.length - 1 ? 'Next story' : 'Explore the modules'} →</a></div>`;
    drawConnections();
    resizeObserver = new ResizeObserver(drawConnections);
    resizeObserver.observe($('#flow-map'));
    if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
  }
  function drawConnections() {
    const map = $('#flow-map');
    if (!map) return;
    const scene = getScene();
    const base = map.getBoundingClientRect();
    const edges = new Map();
    scene.steps.forEach((step, i) => {
      if (i && step.node !== scene.steps[i - 1].node) {
        const from = scene.steps[i - 1].node;
        const key = `${from}-${step.node}`;
        const previous = edges.get(key);
        edges.set(key, {
          from,
          to: step.node,
          visited: previous?.visited || i < state.step,
          active: previous?.active || i === state.step
        });
      }
    });
    const svg = $('#connections');
    svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
    svg.innerHTML =
      '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="connection-arrow"/></marker><marker id="active-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="connection-arrow-active"/></marker></defs>' +
      [...edges.values()]
        .map((edge) => {
          const from = document.getElementById(`node-${edge.from}`).getBoundingClientRect();
          const to = document.getElementById(`node-${edge.to}`).getBoundingClientRect();
          let path;
          if (Math.abs(from.x - to.x) < 5) {
            const x = from.x - base.x + from.width / 2;
            if (to.y > from.y) path = `M ${x} ${from.bottom - base.y} L ${x} ${to.top - base.y - 4}`;
            else {
              const startY = from.y - base.y + from.height / 2;
              const endY = to.y - base.y + to.height / 2;
              const left = from.x - base.x;
              path = `M ${left} ${startY} C ${left - 28} ${startY}, ${left - 28} ${endY}, ${left - 4} ${endY}`;
            }
          } else {
            const forward = to.x > from.x;
            const x1 = (forward ? from.right : from.left) - base.x;
            const x2 = (forward ? to.left - 4 : to.right + 4) - base.x;
            const y1 = from.top - base.y + from.height / 2;
            const y2 = to.top - base.y + to.height / 2;
            const mid = (x1 + x2) / 2;
            path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
          }
          return `<path d="${path}" class="connection ${edge.active ? 'active' : edge.visited ? 'visited' : ''}" marker-end="url(#${edge.active ? 'active-arrow' : 'arrow'})"/>`;
        })
        .join('');
  }
  function saveStoryUrl() {
    const params = new URLSearchParams();
    if (state.selected) params.set('node', state.selected);
    if (state.tab !== 'explanation') params.set('tab', state.tab);
    history.replaceState(
      null,
      '',
      `#story/${state.scene}/${state.step}/${state.lens}${params.size ? '?' + params : ''}`
    );
  }
  function stopPlayback() {
    clearTimeout(timer);
    state.playing = false;
  }
  function scheduleStep() {
    clearTimeout(timer);
    if (state.playing)
      timer = setTimeout(() => {
        if (state.step < getScene().steps.length - 1) {
          state.step++;
          state.selected = null;
          if (state.step === getScene().steps.length - 1) stopPlayback();
          saveStoryUrl();
          renderStory();
          scheduleStep();
        }
      }, 5200 / state.speed);
  }
  function setStep(index) {
    stopPlayback();
    state.step = Math.max(0, Math.min(index, getScene().steps.length - 1));
    state.selected = null;
    saveStoryUrl();
    renderStory();
  }
  function togglePlayback(restart = false) {
    if (state.playing && !restart) stopPlayback();
    else {
      if (restart || state.step === getScene().steps.length - 1) state.step = 0;
      state.selected = null;
      state.playing = true;
    }
    saveStoryUrl();
    renderStory();
    scheduleStep();
  }

  function renderModuleDetail() {
    const id = state.module;
    const meta = snapshot.modules.find((module) => module.id === id);
    if (!meta) return '';
    const info = data.modules[id];
    const consumers = snapshot.modules.filter((module) => module.dependencies.includes(id));
    return `<section class="module-detail" id="module-detail"><div class="module-detail-header"><div><span class="eyebrow">${info[0]}</span><h2>${id}</h2></div><button class="icon-button" id="close-module" aria-label="Close module detail">×</button></div><h3>${info[1]}</h3><p>${info[2]}</p><small>DECLARED INTERNAL DEPENDENCIES</small><div class="dependencies">${meta.dependencies.length ? meta.dependencies.map((dep) => `<button class="dependency" data-module="${dep}">→ ${dep}</button>`).join('') : '<small>No direct internal dependencies found in the included POM declarations.</small>'}</div><small>REFERENCED BY</small><div class="dependencies">${consumers.length ? consumers.map((module) => `<button class="dependency" data-module="${module.id}">${module.id}</button>`).join('') : '<small>No incoming declarations in this inventory.</small>'}</div><div class="module-actions"><a href="${getModuleUrl(id)}" target="_blank" rel="noopener">Browse module on GitHub ↗</a><button class="text-button" data-source="${info[3]}">Read a related implementation</button></div></section>`;
  }
  function renderModules() {
    const categories = ['All', ...new Set(Object.values(data.modules).map((module) => module[0]))];
    $('#main').innerHTML =
      `<section class="section-hero"><span class="eyebrow">THE REPOSITORY, WITHOUT THE HAIRBALL</span><h1>One framework. Several jobs.</h1><p>Start with <strong>flow-server</strong> and <strong>flow-client</strong>. The other modules add UI capabilities, prepare frontend assets, integrate with containers, or package and test the framework.</p><a class="atlas-launch" href="#atlas">Explore the visual dependency atlas <span>2D / 3D ↗</span></a></section><div class="catalog-toolbar" role="group" aria-label="Module categories">${categories.map((category) => `<button class="filter-chip ${state.category === category ? 'active' : ''}" data-category="${category}" aria-pressed="${state.category === category}">${category}</button>`).join('')}<label class="sr-only" for="module-search">Filter modules</label><input id="module-search" type="search" placeholder="Filter modules…" value="${escapeHtml(state.query)}"></div><p class="catalog-note">${snapshot.modules.length} module families. Select a card to explore its purpose and dependencies. Counts include tracked Java / TS / JS files under src/main. Dependency links aggregate direct com.vaadin declarations in each family’s module POMs, including test scopes; they are not a resolved runtime graph. Dependency management, inherited and profile-only dependencies are excluded.</p><div id="module-detail-container">${renderModuleDetail()}</div><div class="module-grid" id="module-grid"></div>`;
    renderModuleCards();
  }
  function renderModuleCards() {
    const modules = snapshot.modules.filter((module) => {
      const info = data.modules[module.id];
      return (
        (state.category === 'All' || info[0] === state.category) &&
        `${module.id} ${info.join(' ')}`.toLowerCase().includes(state.query.toLowerCase())
      );
    });
    $('#module-grid').innerHTML = modules.length
      ? modules
          .map((module) => {
            const info = data.modules[module.id];
            return `<button class="module-card" data-module="${module.id}"><span class="module-category">${info[0]}</span><h3>${module.id}</h3><p>${info[1]}</p><span class="module-meta"><span>${module.sourceCount} source files</span><span>Explore ↗</span></span></button>`;
          })
          .join('')
      : '<p class="empty-state">No modules match. Try a different name or category.</p>';
  }
  function openModule(id) {
    if (!data.modules[id]) return;
    state.module = id;
    history.replaceState(null, '', `#modules/${id}`);
    $('#module-detail-container').innerHTML = renderModuleDetail();
    $('#module-detail').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function renderGuide(id) {
    $('#main').innerHTML =
      `<section class="section-hero"><span class="eyebrow">A SMALL VOCABULARY FOR A LARGE SYSTEM</span><h1>The concepts that unlock Flow.</h1><p>You already know Java and the web. These are the connections specific to Flow: what it owns, what crosses the network, and where each responsibility ends.</p></section><div class="concept-grid">${data.concepts.map((concept, index) => `<article id="concept-${concept.id}" class="concept-card ${concept.id === id ? 'selected-concept' : ''}"><span class="concept-number">FIELD NOTE ${String(index + 1).padStart(2, '0')}</span><h2>${concept.title}</h2><p>${concept.body}</p><div class="concept-nuance"><span class="detail-label">THE USEFUL DISTINCTION</span><p>${concept.nuance}</p></div><div class="concept-links"><a href="#story/${concept.scene}">See it in motion →</a><button class="text-button" data-source="${concept.source}">Read the source ↗</button></div></article>`).join('')}</div>`;
    if (id)
      requestAnimationFrame(() =>
        document.getElementById(`concept-${id}`)?.scrollIntoView({ block: 'center', behavior: 'instant' })
      );
  }
  function getUniqueSources() {
    const seen = new Set();
    return Object.entries(snapshot.sources)
      .filter(([, source]) => {
        if (seen.has(source.path)) return false;
        seen.add(source.path);
        return true;
      })
      .sort((a, b) => a[1].name.localeCompare(b[1].name));
  }
  function renderSourceRows(query = '') {
    const sources = getUniqueSources().filter(([key, source]) =>
      `${key} ${source.path}`.toLowerCase().includes(query.toLowerCase())
    );
    $('#source-list').innerHTML = sources.length
      ? sources
          .map(
            ([key, source], i) =>
              `<button class="source-row" data-source="${key}"><span class="source-index">${String(i + 1).padStart(2, '0')}</span><span><strong>${source.name}</strong><small>${source.path}</small></span><span class="source-arrow">↗</span></button>`
          )
          .join('')
      : '<p class="empty-state">No matching source files. Try a class name or module.</p>';
  }
  function renderSources() {
    $('#main').innerHTML =
      `<section class="section-hero"><span class="eyebrow">NOT JUST BOXES AND ARROWS</span><h1>Follow the explanation into code.</h1><p>${Object.keys(snapshot.files).length} complete source files and guides are bundled here, readable offline. Each journey points to a specific method; open a file to explore the surrounding implementation, or continue to the pinned revision on GitHub.</p></section><div class="catalog-toolbar"><label class="sr-only" for="source-filter">Filter bundled source files</label><input type="search" id="source-filter" placeholder="Find a class or module…" style="margin-left:0;width:320px"></div><div class="source-list" id="source-list"></div>`;
    renderSourceRows();
  }
  function readRoute() {
    stopPlayback();
    resizeObserver?.disconnect();
    window.FLOW_ATLAS.dispose();
    window.FLOW_WORLD.dispose();
    const parts = location.hash.slice(1).split('?')[0].split('/');
    const params = new URLSearchParams(location.hash.split('?')[1]);
    const view = ['story', 'world', 'modules', 'atlas', 'inside', 'guide', 'sources'].includes(parts[0])
      ? parts[0]
      : 'story';
    state.view = view;
    if (view === 'story') {
      state.scene = data.scenes.some((scene) => scene.id === parts[1]) ? parts[1] : 'click';
      const parsed = Number(parts[2]);
      state.step = Number.isInteger(parsed) ? Math.max(0, Math.min(parsed, getScene().steps.length - 1)) : 0;
      state.lens = parts[3] === 'classes' ? 'classes' : 'concepts';
      state.selected = getScene().nodes.some((node) => node.id === params.get('node')) ? params.get('node') : null;
      state.tab = ['inside', 'source'].includes(params.get('tab')) ? params.get('tab') : 'explanation';
      renderStory();
    } else if (view === 'world') {
      window.FLOW_WORLD.render(params);
    } else if (view === 'inside') {
      state.scene = data.scenes.some((scene) => scene.id === parts[1]) ? parts[1] : 'click';
      state.anatomyTitle = window.FLOW_INTERNALS.render(parts[1], parts[2], parts[3], params);
    } else if (view === 'atlas') {
      window.FLOW_ATLAS.render(location.hash.split('?')[1]);
    } else if (view === 'modules') {
      state.module = data.modules[parts[1]] ? parts[1] : null;
      state.category = 'All';
      state.query = '';
      renderModules();
    } else if (view === 'guide') renderGuide(parts[1]);
    else {
      renderSources();
      if (snapshot.sources[parts[1]]) openSource(parts[1]);
    }
    renderNavigation();
    document.title = `${view === 'story' ? getScene().short : view === 'inside' ? state.anatomyTitle : $('#page-label').textContent} — Flow Atlas`;
  }
  function openSource(key, requestedLine) {
    if (!snapshot.sources[key]) return;
    window.FLOW_WORLD.pause();
    if (state.playing) {
      stopPlayback();
      renderStory();
    }
    state.source = key;
    const source = { ...snapshot.sources[key] };
    const lines = snapshot.files[source.path].split('\n');
    if (Number.isInteger(requestedLine) && requestedLine > 0 && requestedLine <= lines.length) {
      source.line = requestedLine;
      source.end = Math.min(lines.length, requestedLine + 12);
    }
    $('#source-title').textContent = source.name;
    $('#source-select').innerHTML = getUniqueSources()
      .map(
        ([id, item]) =>
          `<option value="${id}" ${item.path === source.path ? 'selected' : ''}>${escapeHtml(item.name)}</option>`
      )
      .join('');
    $('#source-path').textContent = `${source.path} · ${lines.length} lines · commit ${snapshot.commit.slice(0, 10)}`;
    $('#source-github').href = `${snapshot.repo}/blob/${snapshot.commit}/${source.path}#L${source.line}`;
    $('#source-code').innerHTML = lines
      .map(
        (line, index) =>
          `<span class="code-line ${index + 1 >= source.line && index + 1 <= source.end ? 'relevant' : ''}" id="line-${index + 1}"><span class="line-number">${index + 1}</span>${highlightCode(line) || ' '}</span>`
      )
      .join('');
    $('#source-find').value = '';
    $('#source-matches').textContent = '';
    state.matches = [];
    if (!$('#source-dialog').open) $('#source-dialog').showModal();
    requestAnimationFrame(() => {
      $('#source-code').scrollTop = Math.max(
        0,
        document.getElementById(`line-${source.line}`).offsetTop - $('#source-code').offsetTop - 40
      );
    });
  }
  function findSourceText(next = false) {
    if (!next) {
      const query = $('#source-find').value.toLowerCase();
      state.matches = [];
      const lines = snapshot.files[snapshot.sources[state.source].path].split('\n');
      document.querySelectorAll('.code-line.match').forEach((line) => line.classList.remove('match', 'current-match'));
      if (query)
        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(query)) {
            state.matches.push(index + 1);
            document.getElementById(`line-${index + 1}`).classList.add('match');
          }
        });
      state.matchIndex = 0;
    } else if (state.matches.length) state.matchIndex = (state.matchIndex + 1) % state.matches.length;
    document.querySelector('.current-match')?.classList.remove('current-match');
    $('#source-matches').textContent = $('#source-find').value
      ? state.matches.length
        ? `${state.matchIndex + 1}/${state.matches.length} lines`
        : 'No matches'
      : '';
    if (state.matches.length) {
      const line = document.getElementById(`line-${state.matches[state.matchIndex]}`);
      line.classList.add('current-match');
      line.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }
  const searchIndex = [
    {
      type: 'SIMULATION',
      title: '3D runtime lab',
      description: 'Operate the browser, Java runtime and memory',
      text: 'simulation heap threads session lock packets client server build',
      route: '#world'
    },
    ...window.FLOW_INTERNALS.index,
    {
      type: 'MAP',
      title: 'Visual dependency atlas',
      description: '2D / 3D module and package dependencies',
      text: 'imports packages concepts architecture',
      route: '#atlas'
    },
    ...snapshot.atlas.packages.map((pkg) => ({
      type: 'PACKAGE',
      title: pkg.name,
      description: pkg.module,
      text: pkg.files.map((path) => path.split('/').pop()).join(' '),
      route:
        '#atlas?' +
        new URLSearchParams({
          module: pkg.module,
          namespace: pkg.language + ':' + pkg.name,
          selected: '@' + pkg.id,
          relation: 'imports'
        })
    })),
    ...data.scenes.map((scene) => ({
      type: 'STORY',
      title: scene.short,
      description: scene.eyebrow.toLowerCase(),
      text: `${scene.title} ${scene.intro}`,
      route: `#story/${scene.id}`
    })),
    ...data.concepts.map((concept) => ({
      type: 'CONCEPT',
      title: concept.title,
      description: 'Concept field guide',
      text: `${concept.body} ${concept.nuance}`,
      route: `#guide/${concept.id}`
    })),
    ...snapshot.modules.map((module) => ({
      type: 'MODULE',
      title: module.id,
      description: data.modules[module.id][1],
      text: data.modules[module.id].join(' '),
      route: `#modules/${module.id}`
    })),
    ...getUniqueSources().map(([key, source]) => ({
      type: 'SOURCE',
      title: source.name,
      description: source.module,
      text: source.path,
      source: key
    }))
  ];
  function renderSearch() {
    const query = $('#global-search').value.trim().toLowerCase();
    const entries = searchIndex
      .map((entry, index) => ({ entry, index }))
      .filter(
        ({ entry }) => !query || `${entry.title} ${entry.description} ${entry.text}`.toLowerCase().includes(query)
      )
      .sort(
        (a, b) =>
          Number(b.entry.title.toLowerCase().includes(query)) - Number(a.entry.title.toLowerCase().includes(query))
      );
    $('#search-results').innerHTML = entries.length
      ? entries
          .slice(0, 30)
          .map(
            ({ entry, index }) =>
              `<button class="search-result" data-result="${index}"><span class="result-type">${entry.type}</span><span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.description)}</small></span></button>`
          )
          .join('')
      : '<p class="empty-state">No results. Try “state”, “Binder”, “push” or a module name.</p>';
  }
  function openSearch() {
    window.FLOW_WORLD.pause();
    if (state.playing) {
      stopPlayback();
      renderStory();
    }
    $('#search-dialog').showModal();
    $('#global-search').value = '';
    renderSearch();
    $('#global-search').focus();
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('.skip-link')) {
      event.preventDefault();
      $('#main').focus();
      return;
    }
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.close) document.getElementById(button.dataset.close).close();
    else if (button.dataset.source) openSource(button.dataset.source, Number(button.dataset.line));
    else if (button.dataset.node) {
      stopPlayback();
      state.selected = button.dataset.node;
      saveStoryUrl();
      renderStory();
    } else if (button.dataset.lens) {
      state.lens = button.dataset.lens;
      saveStoryUrl();
      renderStory();
    } else if (button.dataset.tab) {
      stopPlayback();
      state.tab = button.dataset.tab;
      saveStoryUrl();
      renderStory();
    } else if (button.dataset.step !== undefined) setStep(Number(button.dataset.step));
    else if (button.dataset.module) openModule(button.dataset.module);
    else if (button.dataset.category) {
      state.category = button.dataset.category;
      renderModules();
    } else if (button.dataset.result !== undefined) {
      const entry = searchIndex[Number(button.dataset.result)];
      $('#search-dialog').close();
      if (entry.source) openSource(entry.source);
      else if (location.hash === entry.route) readRoute();
      else location.hash = entry.route;
    } else if (button.id === 'play') togglePlayback();
    else if (button.id === 'demo-click') togglePlayback(true);
    else if (button.id === 'previous') setStep(state.step - 1);
    else if (button.id === 'next') setStep(state.step + 1);
    else if (button.id === 'open-search' || button.id === 'open-search-mobile') openSearch();
    else if (button.id === 'source-next') findSourceText(true);
    else if (button.id === 'close-module') {
      state.module = null;
      history.replaceState(null, '', '#modules');
      $('#module-detail-container').innerHTML = '';
    } else if (button.id === 'share') copyLink();
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'module-search') {
      state.query = event.target.value;
      renderModuleCards();
    } else if (event.target.id === 'source-filter') renderSourceRows(event.target.value);
    else if (event.target.id === 'global-search') renderSearch();
    else if (event.target.id === 'source-find') findSourceText();
  });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'speed') {
      state.speed = Number(event.target.value);
      scheduleStep();
    } else if (event.target.id === 'source-select') openSource(event.target.value);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.querySelector('dialog[open]')) {
      event.preventDefault();
      document.querySelector('dialog[open]').close();
      return;
    }
    const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
    if (event.key === '/' && !editing && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      openSearch();
    }
    if (event.key === 'Enter' && event.target.id === 'source-find') {
      event.preventDefault();
      findSourceText(true);
    }
    if (
      !editing &&
      !document.querySelector('dialog[open]') &&
      state.view === 'story' &&
      event.target === document.body
    ) {
      if (event.key === 'ArrowRight') setStep(state.step + 1);
      else if (event.key === 'ArrowLeft') setStep(state.step - 1);
      else if (event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
      }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.playing) {
      stopPlayback();
      renderStory();
    }
  });
  async function copyLink() {
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast(
        location.protocol === 'file:'
          ? 'Local file link copied. Host the folder to share a web URL.'
          : 'Link copied — ready to share.'
      );
    } catch {
      window.prompt('Copy this explorer link:', url);
    }
  }
  window.addEventListener('hashchange', (event) => {
    const oldScope = event.oldURL.split('#inside/')[1]?.split('/').slice(0, 2).join('/');
    const newScope = event.newURL.split('#inside/')[1]?.split('/').slice(0, 2).join('/');
    const inspectingPart = document.activeElement?.closest('.anatomy-part, .inside-flow-step');
    const fromExecution = document.activeElement?.closest('.inside-flow-step');
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    readRoute();
    if (!oldScope || oldScope !== newScope) window.scrollTo({ top: 0, behavior: 'instant' });
    else if (inspectingPart) {
      document.querySelector('.anatomy-part[aria-current]')?.focus({ preventScroll: true });
      if (fromExecution)
        document.querySelector('.anatomy-detail')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });
  $('#revision').textContent = `${snapshot.version} · ${snapshot.commit.slice(0, 7)}`;
  $('#snapshot-footer').textContent = `SOURCE SNAPSHOT ${snapshot.commit.slice(0, 10)} · ${snapshot.date}`;
  readRoute();
})();
