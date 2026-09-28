/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  const { RuntimeModel, plans } = window.FLOW_RUNTIME_MODEL;
  const objects = window.FLOW_WORLD_DETAILS_CONTENT.objects;
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) =>
    String(value ?? '—').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const format = (value) =>
    typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value ?? '—');
  let model = new RuntimeModel();
  function encode(data) {
    return btoa(
      Array.from(new TextEncoder().encode(JSON.stringify(data)), (byte) => String.fromCharCode(byte)).join('')
    );
  }
  function decode(value) {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0))));
  }
  function create(detailed) {
    let scene,
      abort,
      frame,
      ui,
      elapsed = 0,
      lastTick = 0,
      running = false;
    const route = detailed ? 'world-details' : 'world';
    function saveUrl() {
      const s = model.state;
      const p = new URLSearchParams({
        scenario: s.active?.kind || ui.scenario,
        step: s.active?.index || 0,
        view: ui.view,
        object: ui.object,
        sim: encode(model.serialize())
      });
      if (ui.part) p.set('part', ui.part);
      p.set('panel', ui.panel);
      if (ui.focus) p.set('focus', ui.focus);
      if (ui.inspector) p.set('inspect', '1');
      if (ui.chain) p.set('chain', '1');
      if (ui.explode) p.set('explode', ui.explode);
      history.replaceState(null, '', `#${route}?${p}`);
      p.set('inspect', '1');
      $('#lab-switch').href = `#${detailed ? 'world' : 'world-details'}?${p}`;
    }
    function render(query) {
      dispose();
      const p = new URLSearchParams(query);
      let warning = '';
      if (p.has('sim')) {
        try {
          model = RuntimeModel.restore(decode(p.get('sim')));
        } catch {
          model = new RuntimeModel();
          warning = 'This simulation link could not be restored. A fresh application is ready.';
        }
      } else if (p.has('scenario')) {
        model = new RuntimeModel();
        const kind = Object.hasOwn(plans, p.get('scenario')) ? p.get('scenario') : 'click';
        if (Number(p.get('step')) > 0) model.dispatch(kind);
        for (let i = 0; i < Math.min(Number(p.get('step')) || 0, plans[kind].steps.length - 1); i++) model.advance();
        if (p.get('second') === '1') model.configure('second', true);
      }
      ui = {
        scenario: Object.hasOwn(plans, p.get('scenario')) ? p.get('scenario') : 'click',
        object: Object.hasOwn(objects, p.get('object')) ? p.get('object') : 'browser',
        part: p.get('part') || '',
        focus: Object.hasOwn(objects, p.get('focus')) ? p.get('focus') : null,
        view: ['overview', 'browser', 'runtime', 'memory', 'build'].includes(p.get('view'))
          ? p.get('view')
          : 'overview',
        inspector: detailed || p.get('inspect') === '1',
        panel: ['structure', 'changes', 'messages'].includes(p.get('panel')) ? p.get('panel') : 'structure',
        app: false,
        chain: p.get('chain') === '1',
        all: detailed,
        build: model.state.active?.kind === 'build' || p.get('scenario') === 'build',
        explode: Math.max(0, Math.min(100, Number(p.get('explode')) || 0)),
        speed: 1
      };
      abort = new AbortController();
      document.body.classList.add('lab-page');
      $('#main').innerHTML =
        `<section class="runtime-world runtime-lab ${detailed ? 'runtime-world--detailed' : 'runtime-world--overview'}">
        <header class="lab-heading"><div><span class="eyebrow">${detailed ? 'INSPECT THE EXECUTION' : 'FOLLOW THE BIG PICTURE'}</span><h1>${detailed ? 'Inside the running application' : 'One application. Browser + Java.'}</h1></div><a id="lab-switch" class="world-view-link" href="#${detailed ? 'world' : 'world-details'}">${detailed ? '← Return to overview' : 'Inspect this step →'}</a></header>
        ${warning ? `<p role="status">${esc(warning)}</p>` : ''}
        <section class="world-shell" aria-label="Interactive 3D runtime simulation">
          <div class="world-topbar"><nav class="lab-stages" aria-label="Four stages of a round trip"></nav><button id="lab-inspect-toggle" aria-expanded="${ui.inspector}" aria-controls="world-inspector">Inspector</button><button id="world-fullscreen" aria-label="Toggle fullscreen">⛶</button></div>
          <div class="world-console-toolbar"><label for="world-scenario" class="sr-only">Experiment</label><select id="world-scenario">${Object.entries(
            plans
          )
            .map(([id, p]) => `<option value="${id}">${esc(p.title)}</option>`)
            .join(
              ''
            )}</select><button id="world-play" class="world-run">▶ Run</button><button id="world-previous" class="world-step-control" aria-label="Previous simulation step">←</button><button id="world-next" class="world-step-control" aria-label="Next simulation step">→</button><label class="lab-speed">Speed <select id="world-speed"><option value="0.5">0.5×</option><option selected value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><button id="world-reset">Reset lab</button><details class="lab-experiments"><summary>Experiments & camera</summary><div class="lab-options"><label>Network latency <select id="lab-latency"><option value="0">Instant</option><option value="600">600 ms</option><option value="2000">2 seconds</option><option value="4000">4 seconds</option></select></label><label><input type="checkbox" id="world-hold"> Hold session lock</label><button id="lab-second">Open a second browser tab</button><label><input type="checkbox" id="lab-all" ${ui.all ? 'checked' : ''}> Show all runtime concepts</label><label><input type="checkbox" id="world-follow"> Ride the packet</label><label><input type="checkbox" id="world-build-visible" ${ui.build ? 'checked' : ''}> Show build stage</label><label>Explode layers <input type="range" id="world-explode" min="0" max="100" value="${ui.explode}"></label><div class="world-cameras">${[
            ['overview', 'Whole system'],
            ['browser', 'Browser'],
            ['memory', 'Java memory'],
            ['build', 'Build stage']
          ]
            .map(([id, label]) => `<button data-world-view="${id}">${label}</button>`)
            .join('')}</div></div></details></div>
          <div class="world-simulation"><div class="world-viewport"><div class="world-scene-caption"><span><i class="world-dot"></i>${detailed ? 'OBJECTS, REFERENCES & EXECUTION' : 'THE RUNNING SYSTEM'}</span><span id="world-status"></span></div><div id="world-canvas"></div><div id="world-labels"></div><div id="lab-breadcrumb" class="lab-breadcrumb"></div><button id="lab-open-app" class="lab-open-app" aria-expanded="false">▣ Operate the application</button><section id="lab-app" class="lab-app" aria-label="Simulated browser application" hidden></section><div class="world-camera-help">Drag to orbit · Double-click to open · Enter focuses selection</div><div class="world-view-controls"><button id="world-zoom-in" aria-label="Zoom in">+</button><button id="world-zoom-out" aria-label="Zoom out">−</button><button data-world-view="overview" aria-label="Reset camera">⌂</button></div><div class="world-legend"><span><i class="browser"></i>Browser</span><span><i class="server"></i>Java</span><span class="lab-ref-key">↗ reference</span><span class="lab-rpc-key">→ RPC</span><span class="lab-uidl-key">← UIDL</span></div><div id="world-render-failure" class="world-render-failure" hidden></div></div><aside id="world-inspector" class="world-inspector" aria-label="Runtime inspector"></aside></div>
          <div class="lab-ledger" id="lab-ledger" aria-label="Representations of the counter"></div>
          <section class="lab-narration" aria-live="polite"><div id="world-phase"></div><button id="lab-changes">Inspect changes</button></section>
          <div class="lab-transport"><label for="lab-history">Execution history</label><select id="lab-history" aria-label="Execution history"></select><span id="lab-queue"></span><div id="world-timeline" class="world-timeline" aria-label="Steps of this operation"></div></div>
        </section>
        <details class="lab-model-note"><summary>About this simulation · source-backed conceptual model</summary><p>This deterministic application runs entirely in your browser. Object identities, thread frames, message payloads and timing are illustrative. Nested boundaries show logical ownership, not physical JVM regions. The browser, Java state and stored application data are modeled separately. Buffered Binder validation and explicit repository saves are separate actions. Queued operations run in order to demonstrate the shared session lock; this is not a full scheduler. Push assumes automatic push is configured. Build tooling runs before deployment. Switching views and share links preserve the execution history, including entered example values.</p></details>
      </section>`;
      $('#main').addEventListener('click', handleClick, { signal: abort.signal });
      $('#main').addEventListener('change', handleChange, { signal: abort.signal });
      $('#main').addEventListener(
        'input',
        (e) => {
          if (e.target.id === 'world-explode') {
            ui.explode = Number(e.target.value);
            scene?.setOptions({ explode: ui.explode / 100 });
            saveUrl();
          }
        },
        { signal: abort.signal }
      );
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) pause();
        },
        { signal: abort.signal }
      );
      document.addEventListener(
        'keydown',
        (e) => {
          if (!ui || /INPUT|TEXTAREA|SELECT|CANVAS/.test(e.target.tagName) || e.target.closest('dialog')) return;
          if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            togglePlay();
          }
          if (e.key === 'Escape' && ui.app) {
            ui.app = false;
            renderApp();
          }
        },
        { signal: abort.signal }
      );
      try {
        const Scene = detailed ? window.FLOW_RUNTIME_DETAILS_SCENE : window.FLOW_RUNTIME_SCENE;
        scene = new Scene($('#world-canvas'), $('#world-labels'), selectObject, runApplication);
        scene.onManualCamera = () => {
          const follow = $('#world-follow');
          if (follow) follow.checked = false;
        };
        scene.onPart = (id, part) => selectObject(id, part, true);
        scene.onFocus = (id) => {
          ui.focus = id;
          ui.object = id;
          ui.inspector = true;
          ui.app = id === 'browser';
          update();
        };
        scene.onFocusReset = () => {
          if (ui) {
            ui.focus = null;
            renderBreadcrumb();
          }
        };
        scene.onContextLost = () => {
          pause();
          $('#world-render-failure').hidden = false;
          $('#world-render-failure').textContent =
            '3D graphics were interrupted. Reload to restore the scene; the inspector and simulation remain usable.';
        };
        scene.setOptions({ explode: ui.explode / 100 });
        const initialFocus = ui.focus,
          initialPart = ui.part;
        scene.setView(ui.view);
        if (initialFocus) {
          scene.focusObject?.(initialFocus);
          ui.part = initialPart;
        }
      } catch (error) {
        $('#world-render-failure').hidden = false;
        $('#world-render-failure').textContent =
          'The 3D scene is unavailable. You can still operate the application, step through execution, and inspect every object.';
        console.error(error);
      }
      update();
      elapsed = 0;
      lastTick = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function selectObject(id, part = '', focus = false) {
      if (!Object.hasOwn(objects, id)) return;
      ui.object = id;
      ui.part = part;
      ui.inspector = true;
      ui.app = false;
      scene?.setSelected(id);
      if (focus) {
        scene?.focusObject?.(id);
        ui.part = part;
      }
      update();
      $('#world-inspector').scrollTop = 0;
    }
    function selectKey(key) {
      const [id, ...part] = key.split('/');
      selectObject(id, part.join('/'), true);
    }
    function renderBreadcrumb() {
      const graph = window.FLOW_RUNTIME_INSPECTION.inspect(model.state);
      let key = ui.part ? `${ui.object}/${ui.part}` : ui.focus || ui.object;
      const chain = [],
        seen = new Set();
      while (graph[key] && !seen.has(key)) {
        seen.add(key);
        chain.unshift(graph[key]);
        key = graph[key].parent;
      }
      $('#lab-breadcrumb').innerHTML =
        `<button data-world-view="overview">Whole system</button>${ui.focus || ui.part ? chain.map((item) => `<span>/</span><button data-lab-key="${item.key}">${esc(item.title)}</button>`).join('') : ''}`;
    }
    function renderInspector() {
      const objectHadFocus = document.activeElement?.id === 'world-object';
      const s = model.state,
        graph = window.FLOW_RUNTIME_INSPECTION.inspect(s);
      const key = ui.part && graph[`${ui.object}/${ui.part}`] ? `${ui.object}/${ui.part}` : ui.object;
      const item = graph[key],
        description = objects[item.scene];
      const source = window.FLOW_SNAPSHOT.sources[item.source];
      const pkg = source && window.FLOW_SNAPSHOT.atlas.packages.find((p) => p.files.includes(source.path));
      const incoming = Object.values(graph).filter((o) => o.key !== key && o.fields.some((f) => f.ref === key));
      const fields = item.fields
        .map(
          (f) =>
            `<div class="lab-field"><span>${esc(f.name)}</span>${f.ref ? `<button data-lab-key="${f.ref}" ${f.tab ? `data-lab-ref-tab="${f.tab}"` : ''}>↗ ${esc(f.identity || graph[f.ref]?.identity || f.ref)}</button>` : `<code>${esc(format(f.value))}</code>`}</div>`
        )
        .join('');
      const changes = s.phase.changes || [];
      const changeHTML = changes.length
        ? changes
            .map(
              (c) =>
                `<button class="lab-change" data-lab-key="${c.target}"><strong>${esc(c.label)}</strong><span><del>${esc(format(c.before))}</del> → <ins>${esc(format(c.after))}</ins></span></button>`
            )
            .join('')
        : '<p class="lab-empty">No field changed at this point. The event is travelling, waiting, or executing without a mutation.</p>';
      const messages = s.messages.length
        ? [...s.messages]
            .reverse()
            .map(
              (m, i) =>
                `<details class="lab-message" ${i === 0 ? 'open' : ''}><summary><b>${esc(m.type)}</b> ${esc(m.id)} · UI ${m.tab}<small>${esc(m.status)}</small></summary><pre>${esc(JSON.stringify(m.payload, null, 2))}</pre><button data-lab-key="${m.type === 'UIDL' ? (['click', 'push'].includes(m.kind) ? 'features/text-node' : m.kind === 'binding' ? 'binder' : ['data', 'persistOrders'].includes(m.kind) ? 'provider' : 'ui') : m.type === 'QUERY' ? 'database' : 'server-tree/button-node'}">Inspect the target ↗</button></details>`
            )
            .join('')
        : '<p class="lab-empty">Run an interaction to inspect RPC, UIDL and repository operations.</p>';
      $('#world-inspector').innerHTML =
        `<div class="lab-inspector-head"><label class="sr-only" for="world-object">Runtime object</label><select id="world-object">${Object.entries(
          objects
        )
          .map(([id, o]) => `<option value="${id}" ${id === ui.object ? 'selected' : ''}>${esc(o.title)}</option>`)
          .join(
            ''
          )}</select><button id="lab-close-inspector" aria-label="Close inspector">×</button></div><nav class="lab-inspector-tabs" aria-label="Inspector section">${[
          ['structure', 'Structure'],
          ['changes', 'Changes'],
          ['messages', 'Messages']
        ]
          .map(
            ([id, name]) =>
              `<button data-lab-panel="${id}" aria-pressed="${ui.panel === id}">${name}${id === 'changes' && changes.length ? ` · ${changes.length}` : ''}</button>`
          )
          .join(
            ''
          )}</nav>${ui.panel === 'structure' ? `<span class="world-zone-tag">${esc(description.zone)} · UI ${s.selectedTab}</span><h2>${esc(item.title)}</h2><code class="lab-identity">${esc(item.identity)}</code><button id="world-focus-object" class="lab-focus">⌕ Open in 3D</button>${key === ui.object ? `<p>${esc(description.subtitle)}</p>` : ''}<div class="lab-fields">${fields}</div>${item.children.length ? `<h3>Open inside</h3><div class="lab-children">${item.children.map((k) => `<button data-lab-key="${k}"><span>${esc(graph[k]?.title || k)}</span><small>${esc(graph[k]?.identity || '')} ↗</small></button>`).join('')}</div>` : ''}${incoming.length ? `<h3>Referenced by</h3>${incoming.map((o) => `<button class="lab-reference" data-lab-key="${o.key}">↗ ${esc(o.title)}</button>`).join('')}` : ''}<details class="lab-explanation"><summary>How this concept works</summary><p>${esc(description.body)}</p></details><div class="world-inspect-links">${source ? `<button data-source="${item.source}">Read ${esc(source.name)} ↗</button>` : ''}${pkg ? `<a href="#atlas?${new URLSearchParams({ module: pkg.module, namespace: pkg.language + ':' + pkg.name, selected: '@' + pkg.id, relation: 'imports' })}">Locate its package →</a>` : ''}${description.inside ? `<a href="#inside/${description.inside}/0">Explore the concept anatomy →</a>` : ''}</div>` : ui.panel === 'changes' ? `<h2>What changed?</h2><p>${esc(s.phase.body)}</p>${changeHTML}<h3>Why here?</h3><button class="lab-reference" data-lab-key="${s.phase.node}">${esc(objects[s.phase.node]?.title || s.phase.node)} ↗</button><h3>Next</h3><p>${esc(plans[s.active?.kind || 'click'].steps[(s.active?.index ?? -1) + 1]?.title || (s.pending.length ? 'Run the next queued interaction' : 'Ready for another interaction'))}</p>` : `<h2>Messages & queries</h2><p>Illustrative payloads · latest 30 messages</p>${messages}`}`;
      $('.world-simulation').classList.toggle('lab-inspector-closed', !ui.inspector);
      $('#world-inspector').hidden = !ui.inspector;
      $('#lab-inspect-toggle').setAttribute('aria-expanded', String(ui.inspector));
      if (objectHadFocus && ui.inspector) $('#world-object').focus({ preventScroll: true });
    }
    function renderApp() {
      const s = model.state,
        t = s.tabs.find((t) => t.id === s.selectedTab),
        app = $('#lab-app');
      app.hidden = !ui.app;
      $('#lab-open-app').setAttribute('aria-expanded', String(ui.app));
      if (!ui.app) return;
      const editing = document.activeElement?.closest('#lab-app input');
      const draft = editing && {
        id: editing.id,
        value: editing.value,
        start: editing.selectionStart,
        end: editing.selectionEnd
      };
      const profile = `<label>Name<input id="lab-name" value="${esc(t.draft)}" maxlength="80" autocomplete="off"></label><button data-world-app="binding" class="lab-primary">Validate & write bean</button><button data-world-app="persist">Save accepted bean to database</button><p class="lab-app-facts">Bean: <b>${esc(t.bean)}</b><br>Database: <b>${esc(s.database.profile)}</b></p>`;
      const orders = `<button data-world-app="data" class="lab-primary">Load orders</button>${t.orders.length ? `<table><thead><tr><th>Order</th><th>Customer</th><th>Total</th></tr></thead><tbody>${t.orders.map((o) => `<tr><td>${o.id}</td><td>${esc(o.customer)}</td><td>€${o.total}</td></tr>`).join('')}</tbody></table><label>Edit order #1001 total<input type="number" id="lab-order-total" value="${t.orderTotal}" step="1"></label><button data-world-app="persistOrders">Save order</button>` : '<p>Load records through the application DataProvider.</p>'}`;
      const counter = `<span class="lab-app-eyebrow">COUNTER</span><output id="lab-counter">${t.client}</output><button data-world-app="click" class="lab-primary">Click +1</button><button data-world-app="push">Background update</button>`;
      app.innerHTML = `<header><strong>Flow demo</strong><span>UI #${t.id}</span><button id="lab-close-app" aria-label="Close application panel">×</button></header><div class="lab-app-tabs">${s.tabs.map((tab) => `<button data-lab-tab="${tab.id}" aria-pressed="${tab.id === t.id}">Tab ${tab.id}</button>`).join('')}${s.tabs.length === 1 ? '<button id="lab-second-app">+ Tab</button>' : ''}</div><nav>${[
        ['/counter', 'Counter'],
        ['/profile', 'Profile'],
        ['/orders', 'Orders']
      ]
        .map(
          ([path, title]) =>
            `<button data-lab-route="${path}" aria-pressed="${t.clientRoute === path}">${title}</button>`
        )
        .join(
          ''
        )}</nav><div class="lab-app-body">${t.clientRoute === '/profile' ? profile : t.clientRoute === '/orders' ? orders : counter}${t.validation ? `<p class="lab-validation" role="status">${esc(t.validation)}</p>` : ''}<p class="lab-app-status">${s.active && !s.active.complete ? `Operation #${s.active.id} · UI #${s.active.tab}${s.phase.waiting ? ' · waiting for lock' : ''}` : 'Ready for an interaction'}${s.pending.length ? ` · ${s.pending.length} queued` : ''}</p></div>`;
      if (draft) {
        const input = document.getElementById(draft.id);
        if (input) {
          input.value = draft.value;
          input.focus({ preventScroll: true });
          if (input.type !== 'number') input.setSelectionRange(draft.start, draft.end);
        }
      }
    }

    function runtimeSnapshot() {
      const s = model.state,
        t = s.tabs.find((t) => t.id === s.selectedTab);
      return {
        ...t,
        form: t.clientRoute === '/profile',
        saved: t.bean === t.draft && !t.validation,
        locked: !!(s.lock.owner || s.lock.external),
        waiting: !!s.phase.waiting,
        thread: s.stacks.worker.length ? 'access' : s.stacks.request.length ? 'listener' : 'idle',
        scenario: s.active?.kind || 'click',
        stage: s.phase.node,
        stacks: s.stacks,
        secondValue: s.tabs[1]?.server ?? 7,
        database: s.database,
        selectedTab: s.selectedTab,
        pending: s.pending,
        transport: s.phase.transport,
        queried: s.messages.some((m) => m.type === 'QUERY'),
        changes: s.phase.changes || []
      };
    }
    function getPlan() {
      return plans[model.state.active?.kind || ui.scenario];
    }
    function update() {
      if (!ui) return;
      const focusedStep = document.activeElement?.dataset.worldStep;
      const focusedGroup = document.activeElement?.dataset.labGroup;
      const s = model.state,
        op = s.active,
        plan = getPlan(),
        t = s.tabs.find((t) => t.id === s.selectedTab);
      scene?.setRuntime(runtimeSnapshot());
      scene?.setSelected(ui.object);
      scene?.setOptions({ second: s.tabs.length > 1, buildVisible: ui.build || op?.kind === 'build' });
      const revealed = new Set(['browser', 'network', 'heap', ui.object]);
      if (op) plan.steps.slice(0, op.index + 1).forEach((p) => revealed.add(p.node));
      if (s.phase.group >= 2 && op?.kind !== 'build') ['session', 'ui'].forEach((id) => revealed.add(id));
      if (s.tabs.length > 1) revealed.add('second-ui');
      if (ui.build || ui.view === 'build') ['scanner', 'build', 'bundle'].forEach((id) => revealed.add(id));
      if (ui.view === 'browser') ['dom', 'client-tree', 'client-engine', 'queue'].forEach((id) => revealed.add(id));
      if (ui.view === 'memory')
        ['heap', 'session', 'ui', 'component', 'element', 'server-tree', 'features', 'threads', 'bean'].forEach((id) =>
          revealed.add(id)
        );
      if (scene) {
        scene.revealed = ui.all ? null : revealed;
        scene.traceChain =
          t.clientRoute === '/profile'
            ? ['dom', 'binder', 'bean', 'database']
            : t.clientRoute === '/orders'
              ? ['database', 'provider', 'client-tree', 'dom']
              : ['component', 'element', 'server-tree', 'features', 'client-tree', 'dom'];
        scene.traceSet = ui.chain ? new Set(scene.traceChain) : null;
        scene.setJourney?.(plan.steps, op?.index || 0);
        scene.setPhase(op && op.index > 0 ? plan.steps[op.index - 1].node : null, s.phase.node, 0, running);
      }
      $('.lab-stages').innerHTML = (
        op?.kind === 'build'
          ? ['Discover', 'Generate', 'Bundle', 'Serve']
          : ['Interaction', 'Request', 'Java changes', 'Browser update']
      )
        .map(
          (name, i) =>
            `<button data-lab-group="${i}" aria-label="${i + 1} ${name}" aria-current="${s.phase.group === i ? 'step' : 'false'}"><b>${i + 1}</b><span>${name}</span></button>`
        )
        .join('');
      $('#world-phase').innerHTML =
        `<span class="eyebrow">${op ? `OPERATION #${op.id} · UI #${op.tab}` : 'START HERE'}${s.phase.waiting ? ' · WAITING' : ''}</span><h2>${esc(s.phase.title)}</h2><p>${esc(s.phase.body)}</p>`;
      $('#world-status').textContent = s.phase.waiting
        ? 'Waiting for session lock'
        : running
          ? 'Running'
          : op && !op.complete
            ? 'Paused · inspect this moment'
            : 'Ready';
      $('#world-play').textContent = running
        ? 'Ⅱ Pause'
        : model.canAdvance()
          ? '▶ Continue'
          : s.phase.waiting
            ? 'Waiting for lock'
            : '▶ Run';
      $('#world-previous').disabled = model.cursor === 0;
      $('#world-next').disabled = !model.canAdvance();
      $('#world-scenario').value = op?.kind || ui.scenario;
      $('#world-hold').checked = s.lock.external;
      $('#world-build-visible').checked = ui.build || op?.kind === 'build';
      $('#lab-latency').value = String(s.latency);
      const ledger =
        t.clientRoute === '/profile'
          ? [
              ['dom', 'Field draft', t.draft],
              ['bean', 'Accepted bean', t.bean],
              ['database/profile', 'Stored name', s.database.profile],
              ['binder', 'Validation', t.validation || 'OK']
            ]
          : t.clientRoute === '/orders'
            ? [
                ['dom', 'Browser rows', t.orders.length],
                ['provider', 'Server rows', t.serverOrders.length],
                ['database/orders', 'Stored rows', s.database.orders.length],
                ['database/order-1001', 'Stored total', s.database.orders[0].total]
              ]
            : [
                ['component/view', 'Java counter', t.server],
                ['features/text-node', 'Server text', t.serverText],
                ['client-tree/text-node', 'Client state', t.clientState],
                ['dom/span', 'DOM text', t.client]
              ];
      const traceTitle =
        t.clientRoute === '/profile' ? 'Trace binding' : t.clientRoute === '/orders' ? 'Trace data' : 'Trace the label';
      $('#lab-ledger').setAttribute('aria-label', 'Live application state');
      $('#lab-ledger').innerHTML =
        `<button id="lab-chain" aria-pressed="${ui.chain}">${traceTitle} ${ui.chain ? '●' : '○'}</button>${ledger.map(([key, name, v]) => `<button data-lab-key="${key}" class="${t.clientRoute === '/counter' && v !== t.server ? 'lab-stale' : ''}"><span>${name}</span><strong>${esc(v)}</strong></button>`).join('')}<span class="lab-lock">Lock: <b>${s.lock.external ? 'external' : s.lock.owner || 'free'}</b></span>`;
      $('#lab-history').innerHTML = model.history
        .map(
          (h, i) =>
            `<option value="${i}" ${i === model.cursor ? 'selected' : ''}>${i} · ${esc(h.state.phase.title)}</option>`
        )
        .join('');
      $('#lab-queue').textContent = `${s.pending.length} queued · ${model.cursor}/${model.history.length - 1} events`;
      $('#world-timeline').innerHTML = plan.steps
        .map(
          (p, i) =>
            `<button data-world-step="${i}" class="${op?.index === i ? 'active' : op && i < op.index ? 'done' : ''}" aria-label="Step ${i + 1}: ${esc(p.title)}" title="${esc(p.title)}" ${op?.index === i ? 'aria-current="step"' : ''}><i>${i + 1}</i><span>${esc(p.title)}</span></button>`
        )
        .join('');
      if (ui.app && matchMedia('(max-width: 900px)').matches) ui.inspector = false;
      renderInspector();
      renderApp();
      renderBreadcrumb();
      saveUrl();
      if (focusedStep !== undefined)
        document.querySelector(`[data-world-step="${focusedStep}"]`)?.focus({ preventScroll: true });
      if (focusedGroup !== undefined)
        document.querySelector(`[data-lab-group="${focusedGroup}"]`)?.focus({ preventScroll: true });
    }
    function captureInput() {
      const tab = model.state.tabs.find((t) => t.id === model.state.selectedTab);
      if ($('#lab-name') && $('#lab-name').value !== tab.draft) model.edit('draft', $('#lab-name').value);
      if ($('#lab-order-total') && Number($('#lab-order-total').value) !== tab.orderTotal)
        model.edit('orderTotal', $('#lab-order-total').value);
    }
    function runApplication(action = 'click') {
      captureInput();
      ui.build = action === 'build';
      if (ui.view === 'build' && action !== 'build') {
        ui.view = 'overview';
        scene?.setView('overview');
      }
      if (action === 'profile' || action === 'counter')
        model.dispatch('navigation', { route: action === 'profile' ? '/profile' : '/counter' });
      else model.dispatch(Object.hasOwn(plans, action) ? action : 'click');
      running = true;
      elapsed = 0;
      ui.app = true;
      update();
    }
    function advance() {
      const progressed = model.advance();
      elapsed = 0;
      if (!progressed || !model.canAdvance()) running = false;
      update();
    }
    function pause() {
      running = false;
      if (ui) update();
    }
    function togglePlay() {
      if (running) pause();
      else if (model.state.phase.waiting && model.state.lock.external) {
        ui.inspector = true;
        ui.object = 'session';
        update();
      } else {
        if (!model.canAdvance()) model.dispatch($('#world-scenario').value);
        running = true;
        elapsed = 0;
        update();
      }
    }
    function seekStep(index) {
      running = false;
      elapsed = 0;
      if (!model.state.active) model.dispatch($('#world-scenario').value);
      const op = model.state.active;
      const recorded = model.history.findIndex(
        (h) => h.state.active?.id === op.id && h.state.active.index === index && !h.state.phase.waiting
      );
      if (recorded >= 0) model.seek(recorded);
      else {
        let limit = 50;
        while (
          model.state.active?.id === op.id &&
          model.state.active.index < index &&
          model.canAdvance() &&
          limit-- > 0
        )
          model.advance();
      }
      update();
    }
    function tick(time) {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(150, time - lastTick);
      lastTick = time;
      if (!ui || document.hidden) return;
      const s = model.state,
        op = s.active;
      const duration =
        ['rpc', 'uidl'].includes(s.phase.transport) && ['network', 'push'].includes(s.phase.node)
          ? 700 + s.latency
          : 1400;
      if (running) {
        elapsed += dt * ui.speed;
        if (elapsed >= duration) advance();
      }
      const current = model.state.active;
      scene?.setPhase(
        current && current.index ? getPlan().steps[current.index - 1].node : null,
        model.state.phase.node,
        Math.min(1, elapsed / duration),
        running
      );
    }
    async function handleClick(event) {
      const b = event.target.closest('button');
      if (!b) return;
      if (b.dataset.labKey) {
        if (b.dataset.labRefTab) model.configure('tab', Number(b.dataset.labRefTab));
        ui.panel = 'structure';
        selectKey(b.dataset.labKey);
      } else if (b.dataset.labPanel) {
        ui.panel = b.dataset.labPanel;
        renderInspector();
        $('#world-inspector').scrollTop = 0;
        saveUrl();
      } else if (b.dataset.worldApp) runApplication(b.dataset.worldApp);
      else if (b.dataset.labTab) {
        captureInput();
        model.configure('tab', Number(b.dataset.labTab));
        update();
      } else if (b.dataset.labRoute) {
        captureInput();
        model.dispatch('navigation', { route: b.dataset.labRoute });
        running = true;
        elapsed = 0;
        update();
      } else if (b.dataset.labGroup !== undefined) {
        const index = getPlan().steps.findIndex((p) => p.group === Number(b.dataset.labGroup));
        if (index >= 0) seekStep(index);
      } else if (b.dataset.worldStep !== undefined) seekStep(Number(b.dataset.worldStep));
      else if (b.dataset.worldView) {
        ui.view = b.dataset.worldView;
        ui.focus = null;
        ui.part = '';
        if (ui.view === 'build') ui.build = true;
        scene?.setView(ui.view);
        update();
      } else
        switch (b.id) {
          case 'world-play':
            togglePlay();
            break;
          case 'world-next':
            running = false;
            advance();
            break;
          case 'world-previous':
            running = false;
            model.seek(model.cursor - 1);
            elapsed = 0;
            update();
            break;
          case 'world-reset':
            model = new RuntimeModel();
            running = false;
            elapsed = 0;
            ui.part = '';
            ui.focus = null;
            ui.build = false;
            ui.scenario = 'click';
            ui.object = 'browser';
            ui.panel = 'structure';
            ui.app = false;
            ui.inspector = detailed && !matchMedia('(max-width: 900px)').matches;
            ui.view = 'overview';
            scene?.setView('overview');
            update();
            break;
          case 'lab-inspect-toggle':
            ui.inspector = !ui.inspector;
            if (ui.inspector && matchMedia('(max-width: 900px)').matches) ui.app = false;
            update();
            break;
          case 'lab-close-inspector':
            ui.inspector = false;
            update();
            break;
          case 'lab-open-app':
            ui.app = !ui.app;
            if (ui.app && matchMedia('(max-width: 900px)').matches) ui.inspector = false;
            renderInspector();
            renderApp();
            break;
          case 'lab-close-app':
            captureInput();
            ui.app = false;
            renderApp();
            saveUrl();
            break;
          case 'lab-changes':
            ui.panel = 'changes';
            ui.inspector = true;
            if (matchMedia('(max-width: 900px)').matches) ui.app = false;
            update();
            break;
          case 'lab-chain':
            ui.chain = !ui.chain;
            update();
            break;
          case 'lab-second':
          case 'lab-second-app':
            model.configure('second', true);
            model.configure('tab', 2);
            ui.app = true;
            update();
            break;
          case 'world-focus-object':
            scene?.focusObject?.(ui.object);
            if (ui.object === 'browser') {
              ui.app = true;
              renderApp();
            }
            break;
          case 'world-zoom-in':
          case 'world-zoom-out':
            if (scene) {
              scene.cameraTween = null;
              scene.camera.position
                .sub(scene.controls.target)
                .multiplyScalar(b.id === 'world-zoom-in' ? 0.83 : 1.2)
                .add(scene.controls.target);
            }
            break;
          case 'world-fullscreen':
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await $('.runtime-world').requestFullscreen();
            } catch {
              b.title = 'Fullscreen unavailable';
            }
            break;
        }
    }
    function handleChange(e) {
      const el = e.target;
      if (el.id === 'world-object') selectObject(el.value);
      else if (el.id === 'world-scenario') {
        captureInput();
        model.dispatch(el.value);
        running = false;
        elapsed = 0;
        ui.build = el.value === 'build';
        if (ui.build) scene?.setView('build');
        update();
      } else if (el.id === 'world-speed') ui.speed = Number(el.value);
      else if (el.id === 'world-hold') {
        model.configure('hold', el.checked);
        update();
      } else if (el.id === 'lab-latency') {
        model.configure('latency', Number(el.value));
        update();
      } else if (el.id === 'lab-history') {
        running = false;
        elapsed = 0;
        model.seek(Number(el.value));
        update();
      } else if (el.id === 'world-follow') {
        if (el.checked && scene) {
          ui.focus = null;
          ui.part = '';
          scene.focused = null;
          scene.focusSet = null;
          scene.contextSet = null;
        }
        scene?.setOptions({ follow: el.checked });
        renderBreadcrumb();
        saveUrl();
      } else if (el.id === 'lab-all') {
        ui.all = el.checked;
        update();
      } else if (el.id === 'world-build-visible') {
        ui.build = el.checked;
        update();
      } else if (el.id === 'lab-name' || el.id === 'lab-order-total') {
        captureInput();
        saveUrl();
      }
    }
    function dispose() {
      running = false;
      cancelAnimationFrame(frame);
      abort?.abort();
      abort = null;
      scene?.dispose();
      scene = null;
      ui = null;
      document.body.classList.remove('lab-page');
    }
    return { render, dispose, pause };
  }
  window.FLOW_RUNTIME_LAB = { create };
})();
