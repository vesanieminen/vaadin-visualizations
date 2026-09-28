/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  const { objects, scenarios } = window.FLOW_WORLD_DETAILS_CONTENT;
  const snapshot = window.FLOW_SNAPSHOT;
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const $ = (selector) => document.querySelector(selector);
  let state,
    scene,
    abort,
    frame,
    lastTick,
    elapsed = 0,
    contextLost = false;
  function getScenario() {
    return scenarios[state.scenario];
  }
  function getRuntime() {
    const runtime = {
      client: 7,
      server: 7,
      locked: false,
      dirty: false,
      thread: 'idle',
      route: '/counter',
      clientRoute: '/counter',
      bean: 'Grace'
    };
    getScenario()
      .steps.slice(0, state.step + 1)
      .forEach((step) => Object.assign(runtime, step.effect));
    return runtime;
  }
  function saveUrl() {
    const params = new URLSearchParams({
      scenario: state.scenario,
      step: state.step,
      view: state.view,
      object: state.selected
    });
    if (state.explode) params.set('explode', Math.round(state.explode * 100));
    if (state.second) params.set('second', '1');
    if (state.focused) params.set('focus', state.focused);
    history.replaceState(null, '', '#world-details?' + params);
  }
  function render(query) {
    dispose();
    contextLost = false;
    const params = new URLSearchParams(query);
    const scenario = Object.hasOwn(scenarios, params.get('scenario')) ? params.get('scenario') : 'click';
    state = {
      scenario,
      step: Math.max(0, Math.min(scenarios[scenario].steps.length - 1, Math.trunc(Number(params.get('step'))) || 0)),
      selected: Object.hasOwn(objects, params.get('object')) ? params.get('object') : 'browser',
      view: ['overview', 'browser', 'runtime', 'memory', 'build'].includes(params.get('view'))
        ? params.get('view')
        : 'overview',
      explode: Math.max(0, Math.min(100, Number(params.get('explode')) || 0)) / 100,
      second: params.get('second') === '1',
      buildVisible: true,
      hold: false,
      follow: false,
      playing: false,
      waiting: false,
      speed: 1
    };
    abort = new AbortController();
    elapsed = 0;
    $('#main').innerHTML = `<section class="runtime-world runtime-world--detailed">
      <div class="world-hero"><div><span class="eyebrow">DETAILED 3D RUNTIME LAB</span><h1>Inside the running application.</h1><p>Inspect objects, follow execution, and operate the browser.</p><a class="world-view-link" href="#world">← Back to the 3D runtime lab</a></div><span class="world-model-badge"><i></i> INTERACTIVE SIMULATION<br><small>Source-backed model · not live telemetry</small></span></div>
      <section class="world-shell" aria-label="Interactive 3D runtime simulation">
        <div class="world-topbar"><div class="world-cameras" role="group" aria-label="Camera views">${[
          ['overview', '◈', 'Whole system'],
          ['browser', '▣', 'Browser'],
          ['runtime', '⇄', 'Round trip'],
          ['memory', '◇', 'Java memory'],
          ['build', '⌘', 'Build stage']
        ]
          .map(
            ([id, icon, label]) =>
              `<button data-world-view="${id}" aria-pressed="${state.view === id}"><span>${icon}</span>${label}</button>`
          )
          .join(
            ''
          )}</div><button id="world-caption-toggle" class="world-icon-button" aria-label="Toggle scene narration" aria-pressed="true" title="Show or hide narration">ⓘ</button><button id="world-fullscreen" class="world-icon-button" title="Expand simulation" aria-label="Toggle fullscreen">⛶</button></div>
        <div class="world-simulation"><div class="world-viewport"><div class="world-scene-caption"><span><i class="world-dot"></i> THE RUNNING SYSTEM</span><span id="world-status">Ready to run</span></div><div id="world-canvas"></div><div id="world-labels"></div><div id="world-live-caption" class="world-live-caption"></div><div class="world-camera-help">Drag to orbit · Double-click to focus · Enter focuses selection</div><div id="world-focus-status" class="world-focus-status" hidden></div><div class="world-view-controls"><button id="world-zoom-in" aria-label="Zoom into the scene">+</button><button id="world-zoom-out" aria-label="Zoom out of the scene">−</button><button data-world-view="overview" aria-label="Reset camera">⌂</button></div><div class="world-render-failure" id="world-render-failure" hidden></div><div class="world-legend"><span><i class="browser"></i>Browser</span><span><i class="server"></i>Java runtime</span><span><i class="build"></i>Build time</span><span><i class="packet"></i>Arrow = execution</span><span>Thin line = reference</span></div></div>
          <aside id="world-inspector" class="world-inspector" aria-label="Selected runtime object"></aside></div>
        <div class="world-experiments"><label class="world-explode"><span>Open up the system</span><input id="world-explode" type="range" min="0" max="100" value="${state.explode * 100}" aria-label="Explode the runtime layers"><small>Assembled → Exploded</small></label><label><input id="world-second" type="checkbox" ${state.second ? 'checked' : ''}> Add a second tab</label><label title="Simulate another operation holding this session’s lock"><input id="world-hold" type="checkbox"> Hold session lock</label><label><input id="world-follow" type="checkbox"> Ride the packet</label><label><input id="world-build-visible" type="checkbox" checked> Build stage</label></div>
        <div id="world-state" class="world-state" aria-label="Simulated runtime state"></div>
      </section>
      <section class="world-console" aria-label="Simulation controls"><div class="world-console-toolbar"><label for="world-scenario">EXPERIMENT</label><select id="world-scenario">${Object.entries(
        scenarios
      )
        .map(([id, item]) => `<option value="${id}" ${id === state.scenario ? 'selected' : ''}>${item.title}</option>`)
        .join(
          ''
        )}</select><button id="world-play" class="world-run"></button><button id="world-previous" class="world-step-control" aria-label="Previous simulation step">←</button><button id="world-next" class="world-step-control" aria-label="Next simulation step">→</button><label class="world-speed">Speed <select id="world-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><button id="world-reset" class="quiet-button">↺ Reset</button></div>
      <div class="world-console-body"><div id="world-phase" aria-live="polite"></div><div class="world-payload"><span>AT THE BOUNDARY / ILLUSTRATIVE</span><code id="world-packet"></code><div class="world-progress"><i id="world-progress-fill"></i></div></div></div><div id="world-timeline" class="world-timeline" role="group" aria-label="Scrub the simulation"></div></section>
      <div class="world-footnotes"><p><strong>The idea to keep:</strong> Java objects stay on the server. The browser holds a representation of UI state. Messages keep the two in sync.</p><details><summary>What this simulation represents</summary><p>The scene is a conceptual runtime, not a running Vaadin backend, JVM heap dump or traffic capture. The counter, IDs, object sizes, thread stacks, timing and packets are illustrative. Frames show logical ownership; lines show selected references and relationships, not a complete call graph. Each browser tab here has an independent UI in one shared session. The lock experiment models waiting at a synchronization boundary; it does not emulate every scheduling or request path.</p><p>The stories follow selected successful paths. Push assumes automatic push is configured. Form binding is buffered. The database is optional application infrastructure. The build stage happens before deployment or in development tooling, not inside every UI round trip. Use the source links for the full contract.</p></details></div>
    </section>`;
    $('.world-shell').insertBefore($('.world-console-toolbar'), $('.world-simulation'));
    $('#main').addEventListener('click', handleClick, { signal: abort.signal });
    $('#main').addEventListener('change', handleChange, { signal: abort.signal });
    $('#main').addEventListener(
      'input',
      (event) => {
        if (event.target.id === 'world-explode') {
          state.explode = Number(event.target.value) / 100;
          scene?.setOptions({ explode: state.explode });
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
    try {
      scene = new window.FLOW_RUNTIME_DETAILS_SCENE(
        $('#world-canvas'),
        $('#world-labels'),
        selectObject,
        runApplication
      );
      scene.setOptions({ explode: state.explode, second: state.second });
      scene.onManualCamera = () => {
        state.follow = false;
        $('#world-follow').checked = false;
      };
      if (state.view !== 'overview') scene.setView(state.view);
      scene.onFocusReset = () => {
        state.focused = null;
        $('#world-focus-status').hidden = true;
        saveUrl();
      };
      scene.onFocus = (id) => {
        state.focused = id;
        $('.world-viewport').classList.add('is-focused');
        if (id === 'second-ui') {
          state.second = true;
          $('#world-second').checked = true;
        }
        if (objects[id].zone === 'build') {
          state.buildVisible = true;
          $('#world-build-visible').checked = true;
        }
        saveUrl();
        const status = $('#world-focus-status');
        status.hidden = false;
        status.innerHTML = `<span>Inside ${esc(objects[id].title)}</span><button data-world-view="overview">Back to whole system ↗</button>`;
        document.querySelectorAll('[data-world-view]').forEach((el) => el.setAttribute('aria-pressed', 'false'));
      };
      scene.onContextLost = () => {
        contextLost = true;
        pause();
        showRenderFailure(
          'The 3D graphics context was interrupted. Reload the page to restore the scene. The simulation controls and object explanations remain available.'
        );
      };
    } catch (error) {
      showRenderFailure(
        'The 3D scene could not be initialized. Reload the page to retry. You can still run and inspect the simulation below.'
      );
    }
    updateAll();
    if (Object.hasOwn(objects, params.get('focus'))) scene?.focusObject(params.get('focus'));
    lastTick = performance.now();
    frame = requestAnimationFrame((t) => tick(t));
  }
  function showRenderFailure(message) {
    const el = $('#world-render-failure');
    el.hidden = false;
    el.innerHTML = `<strong>3D scene unavailable</strong><p>${esc(message)}</p>`;
  }
  function selectObject(id) {
    if (!Object.hasOwn(objects, id)) return;
    state.selected = id;
    scene?.setSelected(id);
    renderInspector();
    saveUrl();
  }
  function renderInspector() {
    const restoreFocus = document.activeElement?.id === 'world-object';
    const item = objects[state.selected],
      runtime = getRuntime();
    const source = item.source ? snapshot.sources[item.source] : null;
    const pkg = source ? snapshot.atlas.packages.find((p) => p.files.includes(source.path)) : null;
    const packageUrl = pkg
      ? '#atlas?' +
        new URLSearchParams({
          module: pkg.module,
          namespace: pkg.language + ':' + pkg.name,
          selected: '@' + pkg.id,
          relation: 'imports'
        })
      : null;
    const facts =
      state.selected === 'session'
        ? [
            [
              'Lock',
              state.hold ? 'held by another operation' : runtime.locked ? 'held by this operation' : 'available'
            ],
            ['UIs', state.second ? 'UI #1 + UI #2' : 'UI #1'],
            ['Queued work', state.waiting ? '1 waiting' : '0 in this model']
          ]
        : state.selected === 'threads'
          ? [
              ['Executing', runtime.thread],
              ['Scope', 'illustrative stack'],
              ['UI thread', 'no dedicated thread required']
            ]
          : state.selected === 'server-tree' || state.selected === 'features'
            ? [
                ['Owner', 'UI #1'],
                ['Changes', runtime.dirty ? 'dirty → waiting to encode' : 'clean'],
                ['Java value', runtime.server]
              ]
            : state.selected === 'second-ui'
              ? [
                  ['Counter', '7 (independent)'],
                  ['Session', 'shared with UI #1'],
                  ['Lock', 'shared']
                ]
              : state.selected === 'binder' || state.selected === 'bean'
                ? [
                    ['Bean name', runtime.bean],
                    ['Binding', 'buffered'],
                    ['Persistence', 'application-controlled']
                  ]
                : [
                    ['Browser value', runtime.client],
                    ['Java value', runtime.server],
                    ['Session lock', state.hold ? 'held externally' : runtime.locked ? 'held' : 'available']
                  ];
    $('#world-inspector').innerHTML =
      `<div class="world-inspect-head"><span class="eyebrow">INSPECT THE SYSTEM</span><label class="sr-only" for="world-object">Runtime object</label><select id="world-object">${Object.entries(
        objects
      )
        .map(
          ([id, entry]) =>
            `<option value="${id}" ${id === state.selected ? 'selected' : ''}>${esc(entry.title)}</option>`
        )
        .join(
          ''
        )}</select><button id="world-focus-object" class="world-focus-button">⌕ Zoom into this object</button></div><span class="world-zone-tag">${esc(item.zone.toUpperCase())}</span><h2>${esc(item.title)}</h2><p class="world-inspector-subtitle">${esc(item.subtitle)}</p><p>${esc(item.body)}</p>${state.selected === 'browser' ? `<div class="world-app-actions"><span>TRY THE APPLICATION</span><button data-world-app="click">Click +1</button><button data-world-app="navigation">Open orders</button><button data-world-app="profile">Edit profile</button><button data-world-app="push">Background update</button><button data-world-app="data">Fetch orders</button><button data-world-app="startup">Reconnect</button></div>` : ''}<h3>WHAT IS INSIDE</h3><ul>${item.contains.map((text) => `<li>${esc(text)}</li>`).join('')}</ul><div class="world-object-state"><span>SIMULATED SNAPSHOT</span>${facts.map(([key, value]) => `<div><small>${esc(key)}</small><code>${esc(value)}</code></div>`).join('')}</div><div class="world-inspect-links">${item.inside ? `<a class="world-inside-link" href="#inside/${item.inside}/0">Explore the internals ↗</a>` : ''}${source ? `<button data-source="${item.source}">Read ${esc(source.name)} ↗</button>` : ''}${packageUrl ? `<a href="${esc(packageUrl)}">Find it in the package map →</a>` : ''}<a href="#story/${getScenario().story}">Follow the detailed journey →</a></div>`;
    if (restoreFocus) $('#world-object').focus({ preventScroll: true });
  }
  function updateAll() {
    const scenario = getScenario(),
      step = scenario.steps[state.step],
      runtime = getRuntime();
    scene?.setJourney(scenario.steps, state.step);
    scene?.setRuntime({
      ...runtime,
      scenario: state.scenario,
      stage: step.node,
      locked: state.hold || runtime.locked,
      waiting: state.waiting
    });
    scene?.setSelected(state.selected);
    scene?.setPhase(
      state.step ? scenario.steps[state.step - 1].node : null,
      step.node,
      (elapsed / 2300) * state.speed,
      state.playing && !state.waiting
    );
    $('#world-phase').innerHTML =
      `<span class="eyebrow">STEP ${String(state.step + 1).padStart(2, '0')} / ${String(scenario.steps.length).padStart(2, '0')}</span><h2>${esc(step.title)}</h2><p>${esc(step.body)}</p>${state.waiting ? '<div class="world-wait-message">Work is waiting at the session boundary. Release “Hold session lock” to let it continue.</div>' : ''}`;
    $('#world-live-caption').innerHTML =
      `<span>${esc(scenario.title)} · ${state.step + 1}/${scenario.steps.length}</span><h3>${esc(state.waiting ? 'Waiting for the session lock' : step.title)}</h3><p>${esc(state.waiting ? 'Another operation owns the lock. This work is queued. Release the lock to continue.' : step.body)}</p>`;
    $('#world-packet').textContent = step.packet;
    $('#world-state').innerHTML =
      `<span><i class="browser"></i>Browser <strong>${esc(runtime.client)}</strong></span><span><i class="server"></i>Java <strong>${esc(runtime.server)}</strong></span><span>UI state <strong class="${runtime.dirty ? 'world-dirty' : ''}">${runtime.dirty ? '● dirty' : '● clean'}</strong></span><span>Session <strong>${state.second ? '2 UIs' : '1 UI'}</strong></span><span>Lock <strong>${state.hold ? 'held externally' : runtime.locked ? 'held' : 'available'}</strong></span><span>Access queue <strong>${state.waiting ? '1 waiting' : 'empty'}</strong></span>`;
    $('#world-status').textContent = contextLost
      ? '3D interrupted'
      : state.waiting
        ? 'Waiting for session lock'
        : state.playing
          ? 'Simulation running'
          : state.step === scenario.steps.length - 1
            ? state.scenario === 'build'
              ? 'Frontend build journey complete'
              : 'Synchronized · journey complete'
            : state.step
              ? 'Paused · inspect the state'
              : 'Ready · click the application';
    $('#world-status').classList.toggle('waiting', state.waiting);
    $('#world-play').textContent = state.playing
      ? 'Ⅱ Pause'
      : state.step === scenario.steps.length - 1
        ? '↻ Run again'
        : '▶ ' + scenario.action;
    $('#world-previous').disabled = state.step === 0;
    $('#world-next').disabled = state.step === scenario.steps.length - 1;
    $('#world-timeline').innerHTML = scenario.steps
      .map(
        (item, i) =>
          `<button data-world-step="${i}" class="${i === state.step ? 'active' : i < state.step ? 'done' : ''}" aria-label="Simulation step ${i + 1}: ${esc(item.title)}" ${i === state.step ? 'aria-current="step"' : ''}><i>${i < state.step ? '✓' : i + 1}</i><span>${esc(item.title)}</span></button>`
      )
      .join('');
    renderInspector();
    saveUrl();
  }
  function setStep(index) {
    const fromTimeline = document.activeElement?.hasAttribute('data-world-step');
    state.step = Math.max(0, Math.min(getScenario().steps.length - 1, index));
    elapsed = 0;
    state.waiting = false;
    updateAll();
    if (fromTimeline) document.querySelector(`[data-world-step="${state.step}"]`)?.focus({ preventScroll: true });
  }
  function advance() {
    const next = getScenario().steps[state.step + 1];
    if (!next) {
      state.playing = false;
      updateAll();
      return;
    }
    if (state.hold && next.effect.locked === true) {
      state.waiting = true;
      updateAll();
      return;
    }
    setStep(state.step + 1);
    if (state.step === getScenario().steps.length - 1) {
      state.playing = false;
      updateAll();
    }
  }
  function pause() {
    if (!state || !abort) return;
    state.playing = false;
    scene?.setPhase(
      state.step ? getScenario().steps[state.step - 1].node : null,
      getScenario().steps[state.step].node,
      (elapsed / 2300) * state.speed,
      false
    );
    if ($('#world-play')) updateAll();
  }
  function runApplication(action) {
    state.scenario =
      action === 'profile'
        ? 'binding'
        : action === 'counter'
          ? 'click'
          : Object.hasOwn(scenarios, action)
            ? action
            : getRuntime().form
              ? 'binding'
              : 'click';
    $('#world-scenario').value = state.scenario;
    state.selected = 'browser';
    if (scene?.focused && scene.focused !== 'browser') scene.focusObject('browser');
    state.playing = action !== 'profile' && action !== 'counter';
    state.waiting = false;
    setStep(0);
  }
  function tick(time) {
    frame = requestAnimationFrame((t) => tick(t));
    const dt = Math.min(time - lastTick, 100);
    lastTick = time;
    if (!state || document.hidden) return;
    if (state.playing && !state.waiting) {
      elapsed += dt;
      if (elapsed >= 2300 / state.speed) advance();
    }
    const progress = Math.min(1, (elapsed * state.speed) / 2300);
    const scenario = getScenario();
    scene?.setPhase(
      state.step ? scenario.steps[state.step - 1].node : null,
      scenario.steps[state.step].node,
      progress,
      state.playing && !state.waiting
    );
    $('#world-progress-fill').style.width = `${state.waiting ? 100 : progress * 100}%`;
  }
  async function handleClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.id === 'world-focus-object') {
      scene?.focusObject(state.selected);
    } else if (button.dataset.worldApp) {
      runApplication(button.dataset.worldApp);
    } else if (button.dataset.worldView) {
      $('#world-focus-status').hidden = true;
      state.view = button.dataset.worldView;
      state.follow = false;
      $('#world-follow').checked = false;
      scene?.setOptions({ follow: false });
      scene?.setView(state.view);
      document
        .querySelectorAll('[data-world-view]')
        .forEach((el) => el.setAttribute('aria-pressed', el.dataset.worldView === state.view));
      saveUrl();
    } else if (button.dataset.worldStep !== undefined) {
      state.playing = false;
      setStep(Number(button.dataset.worldStep));
    } else if (button.id === 'world-play') {
      if (state.playing) pause();
      else {
        if (state.step === getScenario().steps.length - 1) setStep(0);
        state.playing = true;
        updateAll();
      }
    } else if (button.id === 'world-next') {
      state.playing = false;
      advance();
    } else if (button.id === 'world-previous') {
      state.playing = false;
      setStep(state.step - 1);
    } else if (button.id === 'world-reset') {
      state.playing = false;
      state.hold = false;
      $('#world-hold').checked = false;
      setStep(0);
    } else if (button.id === 'world-zoom-in' || button.id === 'world-zoom-out') {
      if (scene) {
        scene.cameraTween = null;
        scene.camera.position
          .sub(scene.controls.target)
          .multiplyScalar(button.id === 'world-zoom-out' ? 1.15 : 0.87)
          .add(scene.controls.target);
      }
    } else if (button.id === 'world-caption-toggle') {
      const caption = $('#world-live-caption');
      caption.hidden = !caption.hidden;
      button.setAttribute('aria-pressed', !caption.hidden);
    } else if (button.id === 'world-fullscreen') {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await $('.runtime-world').requestFullscreen();
      } catch {
        button.title = 'Fullscreen is unavailable in this browser';
      }
    }
  }
  function handleChange(event) {
    const el = event.target;
    if (el.id === 'world-object') selectObject(el.value);
    else if (el.id === 'world-scenario') {
      state.scenario = el.value;
      state.playing = false;
      state.selected = getScenario().steps[0].node;
      state.view = el.value === 'build' ? 'build' : 'overview';
      scene?.setView(state.view);
      if (el.value === 'build') {
        state.buildVisible = true;
        $('#world-build-visible').checked = true;
        scene?.setOptions({ buildVisible: true });
      }
      document
        .querySelectorAll('[data-world-view]')
        .forEach((b) => b.setAttribute('aria-pressed', b.dataset.worldView === state.view));
      setStep(0);
    } else if (el.id === 'world-speed') state.speed = Number(el.value);
    else if (el.id === 'world-second') {
      state.second = el.checked;
      scene?.setOptions({ second: state.second });
      updateAll();
    } else if (el.id === 'world-hold') {
      state.hold = el.checked;
      if (!state.hold && state.waiting) {
        state.waiting = false;
        elapsed = 2300 / state.speed;
        if (state.playing) advance();
      }
      updateAll();
    } else if (el.id === 'world-follow') {
      state.follow = el.checked;
      if (el.checked) {
        state.focused = null;
        $('#world-focus-status').hidden = true;
      }
      scene?.setOptions({ follow: state.follow });
    } else if (el.id === 'world-build-visible') {
      state.buildVisible = el.checked;
      scene?.setOptions({ buildVisible: state.buildVisible });
    }
  }
  function dispose() {
    cancelAnimationFrame(frame);
    abort?.abort();
    abort = null;
    scene?.dispose();
    scene = null;
    state = null;
  }
  window.FLOW_WORLD_DETAILS = { render, dispose, pause };
})();
