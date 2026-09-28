/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  const snapshot = window.FLOW_SNAPSHOT;
  const content = window.FLOW_CONTENT;
  const inventory = snapshot.atlas;
  const escapeHtml = (text) =>
    String(text).replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
    );
  const concepts = [
    {
      id: 'state',
      title: 'UI state & synchronization',
      summary:
        'Component and Element shape Java-side state. StateTree records changes; the TypeScript tree and DOM bindings apply them in the browser. The JSON bridge is a protocol relationship, not a Maven dependency.',
      story: 'click',
      sources: ['component', 'element', 'state', 'node', 'encode', 'message', 'changes', 'binding']
    },
    {
      id: 'events',
      title: 'Events & the wire protocol',
      summary:
        'The browser queues an interaction. Server RPC handlers resolve it against the UI, then UidlWriter describes the resulting changes. Follow both ends of the protocol.',
      story: 'click',
      sources: ['connector', 'queue', 'sender', 'request', 'rpc', 'event', 'sync', 'writer', 'message']
    },
    {
      id: 'routing',
      title: 'Routing & view lifecycle',
      summary:
        'The router resolves a target; navigation rendering coordinates observers and the layout chain. Instantiator supplies the view instances.',
      story: 'navigation',
      sources: ['router', 'navigation', 'instantiator', 'internals']
    },
    {
      id: 'push',
      title: 'Sessions, locking & push',
      summary:
        'UI.access schedules safe updates, VaadinSession serializes access, and the push connection delivers changes to the client.',
      story: 'push',
      sources: ['ui', 'session', 'push', 'message']
    },
    {
      id: 'data',
      title: 'Binding, validation & data',
      summary:
        'Binder connects fields to a bean. DataProvider and DataCommunicator handle item fetching and ranges. These APIs use the core server-side UI model.',
      story: 'binding',
      sources: ['binder', 'data', 'provider', 'component', 'sync']
    },
    {
      id: 'build',
      title: 'Frontend discovery & builds',
      summary:
        'Plugin goals delegate to frontend tooling. Scanners discover dependencies; tasks prepare the frontend project; the build entry point coordinates bundle generation.',
      story: 'build',
      sources: ['prepare', 'build', 'scanner', 'tasks', 'imports']
    },
    {
      id: 'di',
      title: 'Dependency injection',
      summary:
        'The core defines Instantiator. Spring, CDI and Quarkus supply container-aware implementations in their own modules.',
      story: 'startup',
      sources: ['instantiator', 'spring', 'cdi', 'quarkus']
    },
    {
      id: 'signals',
      title: 'Signals & reactive UI',
      summary:
        'ValueSignal provides local reactive state. Element bindings connect reactive values to the state tree that Flow synchronizes.',
      story: 'click',
      sources: ['signal', 'element', 'state']
    }
  ];
  const groups = [
    {
      id: 'ui',
      name: 'UI building blocks',
      caption: 'Components, templates and data',
      x: 20,
      y: 35,
      w: 400,
      h: 375,
      z: 26
    },
    {
      id: 'runtime',
      name: 'Core runtime',
      caption: 'The server ↔ browser foundation',
      x: 450,
      y: 155,
      w: 355,
      h: 255,
      z: 65
    },
    {
      id: 'build',
      name: 'Build & development',
      caption: 'Prepare assets and run the dev loop',
      x: 835,
      y: 35,
      w: 395,
      h: 375,
      z: 0
    },
    {
      id: 'integration',
      name: 'Container integrations',
      caption: 'Adapt Flow to an application container',
      x: 20,
      y: 455,
      w: 400,
      h: 215,
      z: 40
    },
    {
      id: 'support',
      name: 'Packaging & tests',
      caption: 'Assemble, align versions and verify',
      x: 450,
      y: 455,
      w: 780,
      h: 215,
      z: 0
    }
  ];
  const packages = new Map(inventory.packages.map((pkg) => [pkg.id, pkg]));
  const filePackages = new Map(inventory.packages.flatMap((pkg) => pkg.files.map((file) => [file, pkg.id])));
  const sourceByPath = new Map(Object.entries(snapshot.sources).map(([id, source]) => [source.path, id]));
  const moduleTrees = new Map();
  let state,
    scope,
    nodes,
    edges,
    selectedEdge,
    main,
    abortController,
    drag,
    suppressClick = false;
  const $ = (selector) => main.querySelector(selector);

  function buildTree(module) {
    if (moduleTrees.has(module)) return moduleTrees.get(module);
    const index = new Map();
    const root = { id: 'root', name: module, children: [], packages: [], parent: null };
    index.set(root.id, root);
    for (const pkg of inventory.packages.filter((item) => item.module === module)) {
      const separator = pkg.language === 'java' ? '.' : '/';
      const segments = pkg.name.split(separator);
      let parent = root;
      for (let i = -1; i < segments.length; i++) {
        const id = pkg.language + ':' + segments.slice(0, i + 1).join(separator);
        let entry = index.get(id);
        if (!entry) {
          entry = {
            id,
            name:
              i < 0
                ? pkg.language === 'java'
                  ? 'Java packages'
                  : 'Frontend & resource folders'
                : segments.slice(0, i + 1).join(separator),
            short: i < 0 ? pkg.language : segments[i],
            children: [],
            packages: [],
            parent: parent.id,
            language: pkg.language
          };
          index.set(id, entry);
          parent.children.push(entry);
        }
        entry.packages.push(pkg.id);
        parent = entry;
      }
      const leaf = {
        id: '@' + pkg.id,
        name: pkg.name,
        short: 'Classes in this package',
        children: [],
        packages: [pkg.id],
        parent: parent.id,
        language: pkg.language,
        direct: true
      };
      index.set(leaf.id, leaf);
      parent.children.unshift(leaf);
      root.packages.push(pkg.id);
    }
    const tree = { root, index };
    moduleTrees.set(module, tree);
    return tree;
  }
  function compressNode(node) {
    while (node.children.length === 1 && !node.children[0].direct) node = node.children[0];
    return node;
  }
  function getChildren(node) {
    if (node.children.length === 1 && node.children[0].direct) return [node.children[0]];
    return node.children.map((entry) => compressNode(entry));
  }
  function getPackageNodes(tree) {
    const parent = tree.index.get(state.namespace) || tree.root;
    scope = parent;
    let entries = getChildren(parent);
    // Expand broad single branches to expose a useful overview of responsibility.
    // Every box still corresponds to a real namespace or source folder.
    while (entries.length < 8) {
      const choices = entries
        .filter((entry) => !entry.direct && entry.children.some((child) => !child.direct))
        .sort((a, b) => b.packages.length - a.packages.length);
      const candidate = choices.find((entry) => entries.length - 1 + getChildren(entry).length <= 18);
      if (!candidate) break;
      entries.splice(entries.indexOf(candidate), 1, ...getChildren(candidate));
    }
    return entries.map((entry) => {
      const files = entry.packages.flatMap((id) => packages.get(id).files);
      const direct = entry.direct || entry.packages.length === 1;
      return {
        id: entry.id,
        label: entry.name,
        short: entry.direct ? '(this package)' : entry.short || entry.name,
        packages: entry.packages,
        count: files.length,
        group: entry.language === 'java' ? 'runtime' : 'build',
        entry,
        canDrill: !direct,
        files
      };
    });
  }
  function createEdges() {
    const nodePackages = new Map(nodes.flatMap((node) => node.packages.map((pkg) => [pkg, node.id])));
    const merged = new Map();
    function addEdge(from, to, count, evidence, type) {
      if (!from || !to || from === to) return;
      const key = from + '|' + to;
      const edge = merged.get(key) || { id: key, from, to, count: 0, evidence: [], type };
      edge.count += count;
      edge.evidence.push(...evidence);
      merged.set(key, edge);
    }
    if (!state.module && state.relation === 'maven') {
      for (const edge of inventory.maven) {
        const declarations = edge.declarations.filter((item) => state.tests || item.scope !== 'test');
        if (declarations.length) addEdge(edge.from, edge.to, declarations.length, declarations, 'maven');
      }
    } else {
      for (const edge of inventory.imports) {
        const from = state.module ? nodePackages.get(edge.from) : packages.get(edge.from).module;
        const to = state.module ? nodePackages.get(edge.to) : packages.get(edge.to).module;
        addEdge(from, to, edge.count, edge.evidence, 'imports');
      }
    }
    return [...merged.values()];
  }
  function getPlacements(concept) {
    return concept.sources.map((id) => ({
      source: id,
      ...snapshot.sources[id],
      package: filePackages.get(snapshot.sources[id].path)
    }));
  }
  function getNodeConcepts(node) {
    return concepts.filter((concept) => getPlacements(concept).some((item) => node.packages.includes(item.package)));
  }
  function makeUrl(overrides = {}) {
    const next = { ...state, ...overrides };
    const params = new URLSearchParams();
    for (const key of ['module', 'namespace', 'selected', 'concept']) if (next[key]) params.set(key, next[key]);
    if (next.mode === '3d') params.set('mode', '3d');
    if (next.relation === 'imports') params.set('relation', 'imports');
    if (next.tests) params.set('tests', '1');
    if (next.all) params.set('all', '1');
    return '#atlas' + (params.size ? '?' + params.toString() : '');
  }
  function saveUrl() {
    history.replaceState(null, '', makeUrl());
  }
  function getGitUrl(path, line) {
    return `${snapshot.repo}/blob/${snapshot.commit}/${path}${line ? '#L' + line : ''}`;
  }
  function shortenLabel(name) {
    return name
      .replace(/^com\.vaadin\.flow\./, '')
      .replace(/^com\.vaadin\./, '')
      .replace(/^frontend\/internal\//, '')
      .replace(/^flow-/, '');
  }
  function getGroup(node) {
    return groups.find((group) => group.id === node.group);
  }
  function getSelected() {
    return nodes.find((node) => node.id === state.selected);
  }
  function getConcept() {
    return concepts.find((concept) => concept.id === state.concept);
  }
  function getBounds() {
    return state.module
      ? {
          width: Math.max(780, Math.min(nodes.length, 4) * 238 + 70),
          height: Math.max(390, Math.ceil(nodes.length / 4) * 120 + 100)
        }
      : { width: 1250, height: 720 };
  }

  function prepareGraph() {
    if (state.module) {
      nodes = getPackageNodes(buildTree(state.module));
      nodes.forEach((node, index) => {
        node.x = 155 + (index % 4) * 238;
        node.y = 100 + Math.floor(index / 4) * 120;
        node.width = 208;
        node.z = 0;
      });
    } else {
      nodes = snapshot.modules.map((module) => ({
        id: module.id,
        label: module.id,
        count: module.sourceCount,
        packages: inventory.packages.filter((pkg) => pkg.module === module.id).map((pkg) => pkg.id),
        group: groups.find((group) => group.name === content.modules[module.id][0]).id
      }));
      for (const group of groups) {
        const members = nodes.filter((node) => node.group === group.id);
        const ordered = group.id === 'runtime' ? ['flow-server', 'flow-client', 'flow-push'] : null;
        if (ordered) members.sort((a, b) => ordered.indexOf(a.id) - ordered.indexOf(b.id));
        const cols = group.id === 'support' ? 4 : group.id === 'runtime' ? 1 : 2;
        const cell = (group.w - 24) / cols;
        members.forEach((node, index) => {
          node.width = Math.min(176, cell - 16);
          node.x = group.x + 12 + cell / 2 + (index % cols) * cell;
          node.y = group.y + 85 + Math.floor(index / cols) * (group.id === 'runtime' ? 65 : 72);
          node.z = group.z;
        });
      }
      scope = null;
    }
    edges = createEdges();
    if (!nodes.some((node) => node.id === state.selected))
      state.selected = state.module
        ? nodes.find((node) => getNodeConcepts(node).length)?.id || nodes[0]?.id || ''
        : 'flow-server';
  }
  function render(params) {
    dispose();
    main = document.getElementById('main');
    abortController = new AbortController();
    const query = new URLSearchParams(params || '');
    state = {
      module: content.modules[query.get('module')] ? query.get('module') : '',
      namespace: query.get('namespace') || '',
      selected: query.get('selected') || '',
      concept: concepts.some((c) => c.id === query.get('concept')) ? query.get('concept') : '',
      mode: query.get('mode') === '3d' ? '3d' : '2d',
      relation: query.get('relation') === 'imports' ? 'imports' : 'maven',
      tests: query.get('tests') === '1',
      all: query.get('all') === '1',
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: -12,
      tilt: 38,
      query: ''
    };
    selectedEdge = null;
    prepareGraph();
    main.innerHTML = `<section class="atlas-hero"><div><span class="eyebrow">THE CODEBASE AS A PLACE</span><h1>See the connections.<br>Then step inside.</h1><p>Follow who uses what, open a module’s packages, and locate the concepts in the actual implementation.</p></div><a class="atlas-original" href="#modules">⊞ Original card map ↗</a></section>
      <section class="dependency-atlas" aria-label="Visual dependency atlas">
      <div class="atlas-top"><div class="atlas-breadcrumb"><button data-atlas-home>Repository</button>${state.module ? `<span> / </span><button data-atlas-open-module="${state.module}">${state.module}</button>${state.namespace ? `<span> / </span><span title="${escapeHtml(scope.name)}">${escapeHtml(shortenLabel(scope.name))}</span>` : ''}` : ''}</div><div class="segmented" role="group" aria-label="Map dimensions"><button data-atlas-mode="2d" class="${state.mode === '2d' ? 'active' : ''}" aria-pressed="${state.mode === '2d'}">2D map</button><button data-atlas-mode="3d" class="${state.mode === '3d' ? 'active' : ''}" aria-pressed="${state.mode === '3d'}">3D layers</button></div></div>
      <div class="atlas-controls"><label>Connections <select id="atlas-relation" ${state.module ? 'disabled' : ''}><option value="maven" ${!state.module && state.relation === 'maven' ? 'selected' : ''}>Maven declarations</option><option value="imports" ${state.module || state.relation === 'imports' ? 'selected' : ''}>Source imports</option></select></label><label class="atlas-check"><input id="atlas-tests" type="checkbox" ${state.tests ? 'checked' : ''} ${state.module || state.relation === 'imports' ? 'disabled' : ''}> Include test scope</label><label class="atlas-check"><input id="atlas-all" type="checkbox" ${state.all ? 'checked' : ''}> All connections</label><label class="atlas-search-label"><span class="sr-only">Find a visible module or package</span><input id="atlas-search" type="search" placeholder="Find on this map…"></label></div>
      <div class="atlas-concepts"><span>LOCATE A CONCEPT</span><button data-atlas-concept="" class="${!state.concept ? 'active' : ''}">All</button>${concepts.map((concept) => `<button data-atlas-concept="${concept.id}" class="${state.concept === concept.id ? 'active' : ''}">${concept.title}</button>`).join('')}</div>
      <div class="atlas-layout"><div class="atlas-map-column"><div class="atlas-map-heading"><span id="atlas-map-summary"></span><span class="atlas-direction">A → B &nbsp; A uses B</span></div><div class="atlas-viewport" tabindex="0" aria-label="Dependency map. Select a node to inspect it. Drag empty space to pan or rotate. Use plus and minus to zoom, R to reset."><svg id="atlas-svg" role="group" aria-label="Selectable module and package dependencies"></svg><div class="atlas-zoom"><button data-atlas-zoom="in" aria-label="Zoom in">+</button><button data-atlas-zoom="out" aria-label="Zoom out">−</button><button data-atlas-reset aria-label="Reset map view">⌂</button></div><div class="atlas-camera" ${state.mode === '2d' ? 'hidden' : ''}><label>Tilt <input id="atlas-tilt" type="range" min="10" max="60" value="${state.tilt}"></label><span>Drag to orbit</span></div><div class="atlas-map-hint" id="atlas-map-hint"></div></div><div class="atlas-legend">${groups.map((group) => `<span class="atlas-color-${group.id}"><i></i>${group.name}</span>`).join('')}<span><i class="atlas-concept-dot"></i>Concept location</span></div><div id="atlas-selection-list" class="atlas-selection-list"></div><details class="atlas-method"><summary>What the connections and positions mean</summary><p>Arrows point from the user of a dependency to the thing it uses. Module positions group responsibility; they are not a call sequence. In 3D, module group platforms sit at different elevations and taller blocks contain more source files.</p><p>Maven edges are direct internal declarations, aggregated across each module family. The test-scope switch adds test declarations; compile, provided, runtime and optional declarations remain labeled in the evidence. Inheritance, dependency management, external libraries and profile-only dependency declarations are not resolved.</p><p>Package edges aggregate explicit Java imports and relative static JavaScript/TypeScript imports in tracked src/main files. They are source references, not a call graph: same-package use, fully qualified references, reflection, dynamic imports, bare npm imports and runtime protocols are not inferred. Ambiguous Java imports are omitted (${inventory.ambiguousImportsSkipped} in this snapshot). Concept locations are curated file anchors, not automatic classifications of every file.</p></details></div><aside class="atlas-inspector" id="atlas-inspector" aria-label="Selected module or package details"></aside></div></section>`;
    main.addEventListener('click', handleClick, { signal: abortController.signal });
    main.addEventListener('input', handleInput, { signal: abortController.signal });
    main.addEventListener('change', handleChange, { signal: abortController.signal });
    main.addEventListener('keydown', handleKey, { signal: abortController.signal });
    const viewport = $('.atlas-viewport');
    viewport.addEventListener('pointerdown', beginDrag, { signal: abortController.signal });
    viewport.addEventListener('pointermove', moveDrag, { signal: abortController.signal });
    viewport.addEventListener('pointerup', endDrag, { signal: abortController.signal });
    viewport.addEventListener('pointercancel', endDrag, { signal: abortController.signal });
    viewport.addEventListener(
      'wheel',
      (event) => {
        if (event.ctrlKey) {
          event.preventDefault();
          state.zoom = Math.max(0.55, Math.min(2.8, state.zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
          drawGraph();
        }
      },
      { passive: false, signal: abortController.signal }
    );
    renderDetails();
    drawGraph();
  }
  function project(x, y, z = 0) {
    const bounds = getBounds();
    let px = x - bounds.width / 2,
      py = y - bounds.height / 2;
    if (state.mode === '3d') {
      const angle = (state.rotation * Math.PI) / 180,
        tilt = (state.tilt * Math.PI) / 180;
      const rx = px * Math.cos(angle) - py * Math.sin(angle),
        ry = px * Math.sin(angle) + py * Math.cos(angle);
      px = rx * 0.9;
      py = ry * Math.cos(tilt) - z * Math.sin(tilt);
    }
    return [bounds.width / 2 + px * state.zoom + state.panX, bounds.height / 2 + py * state.zoom + state.panY];
  }
  function getHeight(node) {
    return state.mode === '3d' ? Math.min(70, Math.log2(node.count + 1) * 7) : 0;
  }
  function getNodePosition(node) {
    const center = project(node.x, node.y, node.z + getHeight(node));
    return {
      x: center[0],
      y: center[1],
      width: node.width * (state.mode === '3d' ? 0.92 : 1) * state.zoom,
      height: 53 * state.zoom
    };
  }
  function getVisibleEdges() {
    return state.all ? edges : edges.filter((edge) => edge.from === state.selected || edge.to === state.selected);
  }
  function drawGraph() {
    if (!main?.isConnected || !$('#atlas-svg')) return;
    const focusedNode = document.activeElement?.closest('#atlas-svg [data-atlas-select]')?.dataset.atlasSelect;
    const focusedEdge = document.activeElement?.closest('#atlas-svg [data-atlas-edge]')?.dataset.atlasEdge;
    const bounds = getBounds(),
      selected = getSelected(),
      concept = getConcept();
    const matching = new Set(
      nodes
        .filter(
          (node) =>
            (!state.query || node.label.toLowerCase().includes(state.query)) &&
            (!concept || getNodeConcepts(node).includes(concept))
        )
        .map((node) => node.id)
    );
    const connected = new Set([
      state.selected,
      ...edges
        .filter((edge) => edge.from === state.selected || edge.to === state.selected)
        .flatMap((edge) => [edge.from, edge.to])
    ]);
    const visibleEdges = getVisibleEdges();
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const svg = $('#atlas-svg');
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    svg.style.minHeight = state.module && nodes.length > 12 ? Math.ceil(nodes.length / 4) * 115 + 'px' : '';
    let html =
      '<defs><marker id="atlas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z"/></marker><marker id="atlas-arrow-in" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z"/></marker></defs>';
    if (!state.module) {
      html += groups
        .map((group) => {
          const corners = [
            [group.x, group.y],
            [group.x + group.w, group.y],
            [group.x + group.w, group.y + group.h],
            [group.x, group.y + group.h]
          ].map(([x, y]) => project(x, y, group.z));
          const label = project(group.x + 18, group.y + 25, group.z);
          return `<g class="atlas-district atlas-color-${group.id}"><polygon points="${corners.map((point) => point.join(',')).join(' ')}"/><text x="${label[0]}" y="${label[1]}">${group.name.toUpperCase()}</text>${state.mode === '2d' ? `<text class="atlas-district-caption" x="${label[0]}" y="${label[1] + 18}">${group.caption}</text>` : ''}</g>`;
        })
        .join('');
    }
    html += visibleEdges
      .map((edge) => {
        const from = getNodePosition(byId.get(edge.from)),
          to = getNodePosition(byId.get(edge.to));
        let x1 = from.x,
          y1 = from.y,
          x2 = to.x,
          y2 = to.y;
        const dx = x2 - x1,
          dy = y2 - y1;
        if (Math.abs(dx) > Math.abs(dy) * 1.7) {
          x1 += Math.sign(dx) * (from.width / 2 + 3);
          x2 -= Math.sign(dx) * (to.width / 2 + 5);
        } else {
          y1 += Math.sign(dy) * (from.height / 2 + 3);
          y2 -= Math.sign(dy) * (to.height / 2 + 5);
        }
        const curve = Math.min(75, Math.abs(dx) * 0.12 + 22);
        const path = `M${x1},${y1} C${x1 + curve},${y1 + (y2 - y1) / 3} ${x2 + curve},${y2 - (y2 - y1) / 3} ${x2},${y2}`;
        const incoming = edge.to === state.selected;
        return `<g class="atlas-edge ${incoming ? 'incoming' : 'outgoing'} ${selectedEdge?.id === edge.id ? 'is-chosen' : ''}" tabindex="0" role="button" aria-label="${escapeHtml(byId.get(edge.from).label)} uses ${escapeHtml(byId.get(edge.to).label)}; show evidence" data-atlas-edge="${escapeHtml(edge.id)}"><path class="atlas-edge-hit" d="${path}"/><path class="atlas-edge-line" d="${path}" marker-end="url(#${incoming ? 'atlas-arrow-in' : 'atlas-arrow'})"/><title>${escapeHtml(byId.get(edge.from).label)} → ${escapeHtml(byId.get(edge.to).label)} · ${edge.count} ${edge.type === 'maven' ? 'declarations' : 'imports'}</title></g>`;
      })
      .join('');
    html += nodes
      .slice()
      .sort((a, b) => getNodePosition(a).y - getNodePosition(b).y)
      .map((node) => {
        const p = getNodePosition(node),
          bottom = project(node.x, node.y, node.z),
          half = p.width / 2,
          h = p.height / 2;
        const conceptMatch = concept && getNodeConcepts(node).includes(concept);
        const dim = state.query || concept ? !matching.has(node.id) : !state.all && !connected.has(node.id);
        const label = state.module ? shortenLabel(node.label) : node.label;
        const lines =
          label.length > 25
            ? [
                label.slice(
                  0,
                  label.lastIndexOf(label.includes('.') ? '.' : label.includes('/') ? '/' : '-', 25) || 25
                ),
                label.slice(
                  (label.lastIndexOf(label.includes('.') ? '.' : label.includes('/') ? '/' : '-', 25) || 25) + 1
                )
              ]
            : [label];
        return `<g class="atlas-node atlas-color-${node.group} ${node.id === state.selected ? 'is-selected' : ''} ${conceptMatch ? 'concept-match' : ''} ${dim ? 'is-dim' : ''}" tabindex="0" role="button" aria-pressed="${node.id === state.selected}" aria-label="${escapeHtml(node.label)}, ${node.count} source files. Inspect ${state.module ? 'package' : 'module'}." data-atlas-select="${escapeHtml(node.id)}">${state.mode === '3d' ? `<path class="atlas-node-side" d="M${p.x - half},${p.y + h} L${bottom[0] - half},${bottom[1] + h} L${bottom[0] + half},${bottom[1] + h} L${p.x + half},${p.y + h}Z"/>` : ''}<rect class="atlas-node-face" x="${p.x - half}" y="${p.y - h}" width="${p.width}" height="${p.height}" rx="7"/><rect class="atlas-node-stripe" x="${p.x - half}" y="${p.y - h + 8}" width="3" height="${p.height - 16}" rx="1.5"/><text class="atlas-node-name" x="${p.x - half + 12}" y="${p.y - (lines.length > 1 ? 10 : 5)}" style="font-size:${13 * state.zoom}px">${lines.map((line, index) => `<tspan x="${p.x - half + 12}" dy="${index ? 12 * state.zoom : 0}">${escapeHtml(line)}</tspan>`).join('')}</text><text class="atlas-node-meta" x="${p.x - half + 12}" y="${p.y + h - 9}" style="font-size:${10 * state.zoom}px">${node.count.toLocaleString()} files${state.module && node.packages.length > 1 ? ' · ' + node.packages.length + ' packages' : ''}</text>${conceptMatch ? `<circle class="atlas-concept-marker" cx="${p.x + half - 9}" cy="${p.y - h + 10}" r="4"/>` : ''}<title>${escapeHtml(node.label)}${state.module ? '' : ': ' + content.modules[node.id][1]}</title></g>`;
      })
      .join('');
    if (!nodes.length)
      html += `<text x="${bounds.width / 2}" y="150" text-anchor="middle" class="atlas-empty-label">This module packages resources or metadata; it has no indexed source packages.</text>`;
    svg.innerHTML = html;
    if (focusedNode || focusedEdge) {
      [...svg.querySelectorAll('[tabindex]')]
        .find((element) =>
          focusedNode ? element.dataset.atlasSelect === focusedNode : element.dataset.atlasEdge === focusedEdge
        )
        ?.focus({ preventScroll: true });
    }
    $('#atlas-map-summary').textContent =
      `${nodes.length} ${state.module ? 'package groups' : 'module families'} · ${visibleEdges.length} of ${edges.length} connections shown`;
    $('#atlas-map-hint').textContent =
      state.mode === '3d'
        ? 'Height = source-file count · drag to orbit · R to reset'
        : 'Select a box or arrow · drag to pan · Ctrl + scroll to zoom';
    const results = nodes.filter((node) => matching.has(node.id));
    $('#atlas-selection-list').innerHTML = state.query
      ? `<span>${results.length} matches</span>${results
          .slice(0, 15)
          .map(
            (node) =>
              `<button data-atlas-select="${escapeHtml(node.id)}">${escapeHtml(shortenLabel(node.label))}</button>`
          )
          .join('')}${!results.length ? '<span>Try a different name or clear the concept filter.</span>' : ''}`
      : '';
  }
  function renderEvidence(edge) {
    const from = nodes.find((node) => node.id === edge.from),
      to = nodes.find((node) => node.id === edge.to);
    return `<div class="atlas-inspector-kicker">CONNECTION EVIDENCE</div><h2>${escapeHtml(shortenLabel(from.label))}<span class="atlas-large-arrow">↓ uses</span>${escapeHtml(shortenLabel(to.label))}</h2><p>${edge.count} ${edge.type === 'maven' ? 'direct Maven declarations' : 'explicit imports'} connect these ${state.module ? 'package groups' : 'modules'} in this snapshot.</p><button class="text-button" data-atlas-select="${escapeHtml(state.selected)}">← Back to selection</button><div class="atlas-evidence">${edge.evidence
      .slice(0, 12)
      .map((item) =>
        edge.type === 'maven'
          ? `<article><span class="atlas-evidence-type">${escapeHtml(item.scope)}${item.optional ? ' · optional' : ''}</span><code>${escapeHtml(item.artifact)}</code><a href="${getGitUrl(item.pom)}" target="_blank" rel="noopener">${escapeHtml(item.pom)} ↗</a></article>`
          : `<article><span class="atlas-evidence-type">${escapeHtml(item.kind)}</span><code>${escapeHtml(item.import)}</code><a href="${getGitUrl(item.path, item.line)}" target="_blank" rel="noopener">${escapeHtml(item.path.split('/').pop())}:${item.line} ↗</a>${item.target ? `<a href="${getGitUrl(item.target)}" target="_blank" rel="noopener">Imported file: ${escapeHtml(item.target.split('/').pop())} ↗</a>` : ''}</article>`
      )
      .join('')}${edge.evidence.length > 12 ? '<small>Showing the first 12 evidence records.</small>' : ''}</div>`;
  }
  function renderConcept(concept, node) {
    const placements = getPlacements(concept).filter((item) => node.packages.includes(item.package));
    return `<section class="atlas-concept-card"><h3>${concept.title}</h3><p>${concept.summary}</p>${placements.map((item) => `<div class="atlas-placement"><button class="text-button" data-source="${item.source}">${item.name}:${item.line} ↗</button><button class="atlas-location" data-atlas-locate="${item.source}" title="Locate this file’s package">⌖ ${escapeHtml(packages.get(item.package)?.name || item.module)}</button></div>`).join('')}<a class="text-button" href="#story/${concept.story}">Follow the runtime story →</a></section>`;
  }
  function renderDetails() {
    const inspector = $('#atlas-inspector');
    if (selectedEdge) {
      inspector.innerHTML = renderEvidence(selectedEdge);
      return;
    }
    const node = getSelected();
    if (!node) {
      inspector.innerHTML = `<div class="atlas-inspector-kicker">RESOURCE / METADATA MODULE</div><h2>${escapeHtml(state.module)}</h2><p>${escapeHtml(content.modules[state.module]?.[2] || 'Select a module to begin.')}</p><a href="${snapshot.repo}/tree/${snapshot.commit}/${state.module}" target="_blank" rel="noopener">Browse module resources ↗</a><button class="atlas-primary" data-atlas-home>Back to repository</button>`;
      return;
    }
    const outgoing = edges.filter((edge) => edge.from === node.id),
      incoming = edges.filter((edge) => edge.to === node.id);
    const nodeConcepts = getNodeConcepts(node);
    const concept = getConcept();
    const shownConcepts = concept ? nodeConcepts.filter((item) => item === concept) : nodeConcepts;
    const label = state.module ? node.label : content.modules[node.id][1];
    const countPackages = node.packages.length;
    inspector.innerHTML = `<div class="atlas-inspector-kicker">${state.module ? 'PACKAGE LOCATION' : content.modules[node.id][0].toUpperCase()}</div><h2>${escapeHtml(label)}</h2>${!state.module ? `<code class="atlas-full-name">${node.id}</code><p>${content.modules[node.id][2]}</p>` : `<p>${countPackages} ${node.entry.language === 'java' ? 'Java packages' : 'source folders'} · ${node.count} source files. ${node.canDrill ? 'Open this namespace to inspect its children.' : 'Files and concept anchors are listed below.'}</p>`}<div class="atlas-stats"><span><strong>${outgoing.length}</strong>uses on map</span><span><strong>${incoming.length}</strong>used by on map</span><span><strong>${countPackages}</strong>packages</span></div>${!state.module ? `<button class="atlas-primary" data-atlas-open-module="${node.id}">Open packages <span>↘</span></button>` : node.canDrill ? `<button class="atlas-primary" data-atlas-open-namespace="${escapeHtml(node.id)}">Open namespace <span>↘</span></button>` : ''}
      <div class="atlas-neighbors"><h3>Uses →</h3>${renderNeighbors(outgoing, true)}<h3>← Used by</h3>${renderNeighbors(incoming, false)}</div>
      ${state.module ? renderPackageReferences(node) : ''}<div class="atlas-concept-section"><h3>Concepts live here <span>${shownConcepts.length}</span></h3>${shownConcepts.map((item) => renderConcept(item, node)).join('')}${!shownConcepts.length ? `<p class="atlas-small-note">${concept ? 'This selection has no curated anchor for that concept. Highlighted boxes show where to look.' : 'No curated concept anchors in this selection. Its source files and dependency evidence are still available.'}</p>` : ''}</div>
      ${state.module ? `<div class="atlas-files"><h3>Files in this selection <span>${node.files.length}</span></h3><label class="sr-only" for="atlas-file-filter">Filter files in this selection</label><input id="atlas-file-filter" type="search" placeholder="Find a class or file…"><div id="atlas-file-list"></div></div>` : `<a class="text-button" href="#modules/${node.id}">Open original card →</a>`}`;
    if (state.module) renderFiles();
  }
  function renderPackageReferences(node) {
    const selected = new Set(node.packages);
    const collect = (outgoing) => {
      const grouped = new Map();
      for (const edge of inventory.imports) {
        const inside = outgoing ? edge.from : edge.to;
        const outside = outgoing ? edge.to : edge.from;
        if (selected.has(inside) && !selected.has(outside)) {
          const entry = grouped.get(outside) || { pkg: packages.get(outside), count: 0, evidence: [] };
          entry.count += edge.count;
          entry.evidence.push(...edge.evidence);
          grouped.set(outside, entry);
        }
      }
      return [...grouped.values()].sort((a, b) => b.count - a.count);
    };
    const list = (entries, label) =>
      `<details class="atlas-package-references"><summary>${label} · ${entries.length} packages</summary>${
        entries.length
          ? entries
              .map(
                ({ pkg, count, evidence }) =>
                  `<div class="atlas-package-reference"><a href="${escapeHtml(makeUrl({ module: pkg.module, namespace: pkg.language + ':' + pkg.name, selected: '@' + pkg.id, relation: 'imports' }))}"><small>${escapeHtml(pkg.module)}</small>${escapeHtml(pkg.name)} →</a><details><summary>${count} imports · evidence</summary>${evidence
                    .slice(0, 3)
                    .map(
                      (item) =>
                        `<p><code>${escapeHtml(item.import)}</code><a href="${getGitUrl(item.path, item.line)}" target="_blank" rel="noopener">${escapeHtml(item.path.split('/').pop())}:${item.line} ↗</a></p>`
                    )
                    .join('')}</details></div>`
              )
              .join('')
          : '<p class="atlas-small-note">No resolved references outside this selection.</p>'
      }</details>`;
    return `<section class="atlas-reference-section"><h3>Across the repository</h3><p class="atlas-small-note">All resolved package imports crossing this selection, including packages outside the current map.</p>${list(collect(true), 'Uses')}${list(collect(false), 'Used by')}</section>`;
  }
  function renderNeighbors(list, outgoing) {
    if (!list.length) return '<p class="atlas-small-note">None in the current scope and connection filter.</p>';
    return list
      .map((edge) => {
        const other = nodes.find((node) => node.id === (outgoing ? edge.to : edge.from));
        return `<div class="atlas-neighbor"><button data-atlas-select="${escapeHtml(other.id)}" title="Select ${escapeHtml(other.label)}">${escapeHtml(shortenLabel(other.label))}</button><button class="atlas-evidence-button" data-atlas-edge="${escapeHtml(edge.id)}" aria-label="Show dependency evidence for ${escapeHtml(other.label)}">${edge.count} ↗</button></div>`;
      })
      .join('');
  }
  function renderFiles() {
    const query = $('#atlas-file-filter').value.toLowerCase();
    const files = getSelected().files.filter((path) => path.toLowerCase().includes(query));
    $('#atlas-file-list').innerHTML =
      files
        .slice(0, 70)
        .map((path) => {
          const source = sourceByPath.get(path);
          return `<div class="atlas-file">${source ? `<button data-source="${source}" title="Read bundled source">${escapeHtml(path.split('/').pop())} <span>offline ↗</span></button>` : `<a href="${getGitUrl(path)}" target="_blank" rel="noopener" title="${escapeHtml(path)}">${escapeHtml(path.split('/').pop())} <span>GitHub ↗</span></a>`}</div>`;
        })
        .join('') +
      (files.length > 70
        ? `<p class="atlas-small-note">Showing 70 of ${files.length} files. Filter by name to find the rest.</p>`
        : !files.length
          ? '<p class="atlas-small-note">No matching files.</p>'
          : '');
  }
  function selectNode(id) {
    if (!nodes.some((node) => node.id === id)) return;
    state.selected = id;
    selectedEdge = null;
    saveUrl();
    drawGraph();
    renderDetails();
  }
  function locateSource(id) {
    const source = snapshot.sources[id],
      pkg = packages.get(filePackages.get(source.path));
    if (!pkg) return;
    const tree = buildTree(pkg.module),
      leaf = tree.index.get('@' + pkg.id);
    location.hash = makeUrl({ module: pkg.module, namespace: leaf.parent, selected: leaf.id, relation: 'imports' });
  }
  function handleClick(event) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const target = event.target.closest('[data-atlas-select],[data-atlas-edge],button');
    if (!target) return;
    if (target.hasAttribute('data-atlas-select')) selectNode(target.dataset.atlasSelect);
    else if (target.hasAttribute('data-atlas-edge')) {
      selectedEdge = edges.find((edge) => edge.id === target.dataset.atlasEdge);
      renderDetails();
      drawGraph();
    } else if (target.hasAttribute('data-atlas-mode')) {
      state.mode = target.dataset.atlasMode;
      state.zoom = 1;
      state.panX = state.panY = 0;
      main.querySelectorAll('[data-atlas-mode]').forEach((button) => {
        button.classList.toggle('active', button.dataset.atlasMode === state.mode);
        button.setAttribute('aria-pressed', button.dataset.atlasMode === state.mode);
      });
      $('.atlas-camera').hidden = state.mode === '2d';
      saveUrl();
      drawGraph();
    } else if (target.hasAttribute('data-atlas-concept')) {
      state.concept = target.dataset.atlasConcept;
      main
        .querySelectorAll('[data-atlas-concept]')
        .forEach((button) => button.classList.toggle('active', button.dataset.atlasConcept === state.concept));
      saveUrl();
      drawGraph();
      renderDetails();
    } else if (target.hasAttribute('data-atlas-open-module'))
      location.hash = makeUrl({
        module: target.dataset.atlasOpenModule,
        namespace: '',
        selected: '',
        relation: 'imports'
      });
    else if (target.hasAttribute('data-atlas-open-namespace'))
      location.hash = makeUrl({ namespace: target.dataset.atlasOpenNamespace, selected: '' });
    else if (target.hasAttribute('data-atlas-locate')) locateSource(target.dataset.atlasLocate);
    else if (target.hasAttribute('data-atlas-home'))
      location.hash = makeUrl({ module: '', namespace: '', selected: state.module || 'flow-server' });
    else if (target.hasAttribute('data-atlas-zoom')) {
      state.zoom = Math.max(0.55, Math.min(2.8, state.zoom * (target.dataset.atlasZoom === 'in' ? 1.2 : 1 / 1.2)));
      drawGraph();
    } else if (target.hasAttribute('data-atlas-reset')) resetCamera();
  }
  function handleInput(event) {
    if (event.target.id === 'atlas-search') {
      state.query = event.target.value.trim().toLowerCase();
      drawGraph();
    } else if (event.target.id === 'atlas-file-filter') renderFiles();
    else if (event.target.id === 'atlas-tilt') {
      state.tilt = Number(event.target.value);
      drawGraph();
    }
  }
  function handleChange(event) {
    if (event.target.id === 'atlas-relation') {
      state.relation = event.target.value;
      $('#atlas-tests').disabled = state.relation === 'imports';
    } else if (event.target.id === 'atlas-tests') state.tests = event.target.checked;
    else if (event.target.id === 'atlas-all') state.all = event.target.checked;
    else return;
    selectedEdge = null;
    edges = createEdges();
    saveUrl();
    drawGraph();
    renderDetails();
  }
  function resetCamera() {
    state.zoom = 1;
    state.panX = state.panY = 0;
    state.rotation = -12;
    state.tilt = 38;
    $('#atlas-tilt').value = 38;
    drawGraph();
  }
  function handleKey(event) {
    const interactive = event.target.closest('[data-atlas-select],[data-atlas-edge]');
    if (interactive && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      interactive.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }
    if (event.target !== $('.atlas-viewport')) return;
    if (event.key === '+' || event.key === '=') state.zoom = Math.min(2.8, state.zoom * 1.2);
    else if (event.key === '-') state.zoom = Math.max(0.55, state.zoom / 1.2);
    else if (event.key.toLowerCase() === 'r') {
      resetCamera();
      event.preventDefault();
      return;
    } else if (event.key === 'ArrowLeft') state.mode === '3d' ? (state.rotation -= 6) : (state.panX -= 30);
    else if (event.key === 'ArrowRight') state.mode === '3d' ? (state.rotation += 6) : (state.panX += 30);
    else if (event.key === 'ArrowUp') state.panY -= 30;
    else if (event.key === 'ArrowDown') state.panY += 30;
    else return;
    event.preventDefault();
    drawGraph();
  }
  function beginDrag(event) {
    if (event.target.closest('[data-atlas-select],[data-atlas-edge],button,input,label')) return;
    drag = {
      x: event.clientX,
      y: event.clientY,
      panX: state.panX,
      panY: state.panY,
      rotation: state.rotation,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event) {
    if (!drag) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.moved = true;
    if (state.mode === '3d') {
      state.rotation = drag.rotation + dx * 0.22;
      state.panY = drag.panY + dy * 0.4;
    } else {
      const scale = getBounds().width / event.currentTarget.clientWidth;
      state.panX = drag.panX + dx * scale;
      state.panY = drag.panY + dy * scale;
    }
    drawGraph();
  }
  function endDrag() {
    if (drag?.moved) suppressClick = true;
    drag = null;
  }
  function dispose() {
    abortController?.abort();
    drag = null;
  }
  window.FLOW_ATLAS = { render, dispose };
})();
