/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  // These are diagrams made from runtime structures, not physical server parts.
  const P = window.FLOW_RUNTIME_DETAILS_SCENE.prototype;
  const roleNames = {
    dom: 'Nested HTML elements',
    'client-tree': 'Node IDs → browser state',
    'client-engine': 'Apply updates → bind DOM',
    queue: 'Events waiting to send',
    network: 'RPC out / UIDL back',
    servlet: 'Request entry & dispatch',
    service: 'Route → view instance',
    heap: 'Java objects live here',
    session: 'Shared lock · owns UIs',
    ui: 'One tab’s object graph',
    component: 'Your listener runs here',
    element: 'Java façade over a node',
    'server-tree': 'UI state & dirty nodes',
    features: 'Data inside each node',
    writer: 'Changes → JSON',
    threads: 'Work runs on these stacks',
    access: 'Tasks awaiting the lock',
    push: 'Server → browser transport',
    binder: 'Field → convert → validate',
    bean: 'Application data',
    provider: 'Fetch a range of rows',
    database: 'Optional persistence',
    scanner: 'Find frontend dependencies',
    build: 'Generate → bundle',
    bundle: 'Browser code, not UI state',
    'second-ui': 'Separate state · same lock'
  };
  P.createPlate = function (group, title, rows, position, width, color, options = {}) {
    const T = this.T,
      height = options.height || 1.55;
    const backing = this.box(group, [width, height, 0.13], position, 0x1b3042, { edge: color });
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = Math.round((700 * height) / width);
    canvas.dataset.model = group.userData.id;
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const face = new T.Mesh(
      new T.PlaneGeometry(width - 0.04, height - 0.04),
      new T.MeshBasicMaterial({ map: texture, toneMapped: false })
    );
    face.position.set(position[0], position[1], position[2] + 0.075);
    face.userData.id = group.userData.id;
    group.add(face);
    this.pickables.push(face);
    const panel = {
      group,
      title,
      rows,
      canvas,
      texture,
      face,
      backing,
      width: width - 0.04,
      height: height - 0.04,
      color,
      draw: options.draw,
      key: options.key
    };
    this.modelPanels.push(panel);
    if (this.software) {
      canvas.className = 'world-model-face';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.width = canvas.width + 'px';
      canvas.style.height = canvas.height + 'px';
      this.host.append(canvas);
    }
    return panel;
  };
  P.modelLink = function (group, from, to, color, arrow = true) {
    const T = this.T,
      a = new T.Vector3(...from),
      b = new T.Vector3(...to);
    group.add(
      new T.Line(
        new T.BufferGeometry().setFromPoints([a, b]),
        new T.LineBasicMaterial({ color, transparent: true, opacity: 0.8 })
      )
    );
    if (arrow) {
      const tip = new T.Mesh(new T.CylinderGeometry(0, 0.085, 0.25, 6), new T.MeshBasicMaterial({ color }));
      tip.position.copy(b.clone().lerp(a, 0.08));
      tip.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
      group.add(tip);
    }
  };
  P.createFrame = function (group, width, height, depth, color) {
    for (const x of [-width / 2, width / 2])
      for (const z of [-depth / 2, depth / 2])
        this.box(group, [0.035, height, 0.035], [x, 0, z], color, { edges: false });
    for (const y of [-height / 2, height / 2]) {
      for (const z of [-depth / 2, depth / 2])
        this.box(group, [width, 0.035, 0.035], [0, y, z], color, { edges: false });
      for (const x of [-width / 2, width / 2])
        this.box(group, [0.035, 0.035, depth], [x, y, 0], color, { edges: false });
    }
    group.userData.bounds = [width, height, depth];
  };
  P.createModel = function (group, id) {
    const T = this.T,
      c = this.palette,
      zone = window.FLOW_WORLD_DETAILS_CONTENT.objects[id].zone;
    const color =
      zone === 'browser'
        ? c.blue
        : zone === 'build'
          ? c.purple
          : ['network', 'application'].includes(zone)
            ? c.orange
            : c.green;
    const plate = (title, rows, pos = [0, 0.3, 0], w = 2.8, opts = {}) =>
      this.createPlate(group, title, rows, pos, w, color, opts);
    const link = (a, b) => this.modelLink(group, a, b, color);
    group.userData.bounds = [3.2, 2.5, 1.2];
    group.userData.labelOffset.set(0, 1.7, 0);
    group.userData.label.querySelector('span').innerHTML += `<small>${roleNames[id]}</small>`;
    if (id === 'heap' || id === 'session') {
      this.createFrame(
        group,
        id === 'heap' ? 13.3 : 9.6,
        id === 'heap' ? 5.8 : 4.7,
        id === 'heap' ? 11 : 7.6,
        id === 'heap' ? 0x546d80 : color
      );
      group.userData.labelOffset.set(id === 'heap' ? 2 : -3.2, id === 'heap' ? 3.2 : 2.6, -3.5);
      if (id === 'heap') {
        plate(
          'Heap · surviving objects',
          (r) => [
            'session → UI #1 → view',
            'view.counter = ' + r.server,
            'view → Button + Span',
            'UIInternals → StateTree'
          ],
          [-3, 0.8, -5.1],
          4,
          { height: 2.3 }
        );
      }
      if (id === 'session') {
        this.createLock(group);
        plate(
          'VaadinSession',
          (r) => ['lock: ' + (r.locked ? 'HELD' : 'available'), this.second ? 'UI #1, UI #2' : 'UI #1'],
          [-3.15, 1.8, 3.83],
          2.1,
          { height: 1 }
        );
      }
      return;
    }
    if (id === 'ui') {
      this.box(group, [8.5, 0.06, 6.6], [0, -0.1, 0.5], color, { opacity: 0.12 });
      plate('UI #1 · UIInternals', ['owns StateTree', 'one browser tab'], [0, 0.1, -2.5], 3.2, { height: 1 });
      group.userData.bounds = [9, 2, 7];
      group.userData.labelOffset.set(-4, 0.1, 2.6);
      return;
    }
    if (id === 'dom') {
      plate(
        'DOM · actual elements',
        (r) =>
          r.form
            ? ['<form>', '  <vaadin-text-field>', '    value = Ada', '  <vaadin-button> Save']
            : r.clientRoute === '/orders'
              ? ['<div>', '  <vaadin-grid>', '    rows = ' + (r.orders?.length || 0), '  </vaadin-grid>']
              : ['<div>', '  <vaadin-button>', '    click listener', '  <span> ' + r.client + ' </span>'],
        [0, 0.7, 0],
        3.6,
        { height: 2.5, draw: 'dom' }
      );
      group.userData.labelOffset.y = 2.25;
      return;
    }
    if (['component', 'client-tree', 'server-tree', 'second-ui'].includes(id)) {
      const java = id === 'component',
        second = id === 'second-ui';
      const top = java
        ? (r) => (r.form ? 'ProfileView' : r.route === '/orders' ? 'OrdersView' : 'CounterView')
        : second
          ? 'UI #2'
          : 'StateNode #1';
      const rootRows = java
        ? (r) =>
            r.form
              ? ['binder → Binder<Person>', 'name → TextField', 'save → Button']
              : r.route === '/orders'
                ? ['grid → Grid<Order>', 'provider → DataProvider']
                : ['counter = ' + r.server, 'button → Button', 'label → Span']
        : ['children → [7, 8]'];
      const topCard = plate(top, rootRows, [0, 1.15, -0.3], java ? 2.5 : 2, { height: java ? 1.65 : 0.8 });
      const left = plate(
        (r) =>
          java
            ? r.form
              ? 'TextField'
              : r.route === '/orders'
                ? 'Grid<Order>'
                : 'Button'
            : r.form
              ? '#7 · field'
              : r.route === '/orders'
                ? '#7 · grid'
                : '#7 · button',
        (r) =>
          r.form
            ? ['value = Ada']
            : r.route === '/orders'
              ? ['items: ' + (r.orders?.length || 0)]
              : java
                ? ['ClickListener']
                : ['event: click'],
        [-1.05, -0.05, 0.25],
        1.85,
        { height: 0.85 }
      );
      const right = plate(
        (r) =>
          java && r.form ? 'Person' : java && r.route === '/orders' ? 'DataProvider' : java ? 'Span' : '#8 · span',
        (r) =>
          java && r.form
            ? ['name = ' + r.bean]
            : java && r.route === '/orders'
              ? ['fetch(offset, limit)']
              : ['text = "' + (second ? 7 : id === 'client-tree' ? r.client : r.server) + '"'],
        [1.05, -0.05, 0.25],
        1.85,
        { height: 0.85, key: 'value' }
      );
      link([0, 0.7, -0.3], [-1.05, 0.45, 0.25]);
      link([0, 0.7, -0.3], [1.05, 0.45, 0.25]);
      group.userData.treeBoxes = [topCard.backing, left.backing, right.backing];
      group.userData.bounds = [4.1, 2.8, 1.5];
      group.userData.labelOffset.y = 2.1;
      if (second) group.scale.setScalar(0.6);
      return;
    }
    if (id === 'element') {
      plate('Element', ['setText("…")', 'node → StateNode #8'], [0, 0.3, 0], 2.5);
      link([0, -0.5, 0], [0, -1.1, 0.7]);
      return;
    }
    if (id === 'features') {
      plate(
        'Span + text node features',
        (r) => [
          'ElementData  → span',
          'ElementChildrenList → text',
          'TextNodeMap value = ' + r.server,
          r.dirty ? '● DIRTY · awaiting encode' : '○ clean'
        ],
        [0, 0.6, 0],
        3,
        { height: 2.1, key: 'dirty' }
      );
      group.userData.labelOffset.y = 2;
      return;
    }
    if (id === 'queue' || id === 'access') {
      // An ordered queue, with a waiting item and an explicit exit.
      this.box(group, [3.1, 0.12, 1.3], [0, -0.4, 0], color, { opacity: 0.2 });
      for (const z of [-0.65, 0.65]) this.box(group, [3.1, 0.2, 0.04], [0, -0.25, z], color);
      for (let i = 0; i < 3; i++)
        plate(
          id === 'queue' ? ['event', 'node', 'send'][i] : ['task', 'task', 'lock'][i],
          (r) => [
            id === 'queue' ? ['click', '7', '→'][i] : [r.waiting ? 'WAIT' : '…', '…', r.locked ? 'held' : 'free'][i]
          ],
          [-0.95 + i * 0.95, 0.2, 0],
          0.86,
          { height: 0.9 }
        );
      link([-1.5, -0.1, 0.8], [1.6, -0.1, 0.8]);
      return;
    }
    if (id === 'network') {
      for (let i = 0; i < 2; i++) {
        const z = i * 0.9;
        link(i ? [1.3, 0, z] : [-1.3, 0, z], i ? [-1.3, 0, z] : [1.3, 0, z]);
      }
      plate('HTTP / push', ['→ RPC · event + node ID', '← UIDL · changes + constants'], [0, 0.9, 0], 3.4, {
        height: 1.3
      });
      group.userData.bounds = [3.6, 2.5, 2];
      group.userData.labelOffset.y = 1.9;
      return;
    }
    if (id === 'servlet') {
      // The gate is a dispatch boundary, not a heap object or a thread.
      for (const x of [-1.55, 1.55]) this.box(group, [0.22, 2.5, 0.6], [x, 0.5, 0], color);
      plate('Request dispatch', ['VaadinServlet → service', 'UI lookup → RPC handler'], [0, 1.1, 0], 3.05, {
        height: 1.35
      });
      link([0, -0.65, 1.3], [0, -0.65, -1.3]);
      return;
    }
    if (id === 'service') {
      plate(
        'Router / Instantiator',
        (r) => ['location: ' + r.route, '/counter → CounterView', '/orders → OrdersView'],
        [0, 0.5, 0],
        3.4,
        { height: 1.8 }
      );
      link([-0.8, -0.5, 0], [-1.6, -0.7, 1]);
      link([0.8, -0.5, 0], [1.6, -0.7, 1]);
      return;
    }
    if (id === 'threads') {
      ['Request stack', 'Worker / access stack'].forEach((title, i) => {
        plate(
          title,
          (r) =>
            i
              ? ['worker', 'access'].includes(r.thread)
                ? [
                    'TOP · application task',
                    r.thread === 'access' ? 'UI.access callback' : 'compute result = 8',
                    'local ui → UI #1',
                    r.locked ? 'session lock: held' : 'UI mutation needs lock'
                  ]
                : ['no active task', 'frames have returned', 'no dedicated UI thread']
              : r.thread !== 'idle' && !['worker', 'access'].includes(r.thread)
                ? [
                    r.thread === 'listener'
                      ? 'TOP · ClickListener'
                      : r.thread === 'fetch'
                        ? 'TOP · DataProvider.fetch'
                        : 'TOP · RPC handler',
                    'ServerRpcHandler',
                    'VaadinService',
                    'local ui → UI #1'
                  ]
                : ['no active request', 'frames have returned', 'heap objects remain'],
          [-1.5 + i * 3.05, 0.65, 0],
          2.9,
          { height: 2.5 }
        );
        for (let j = 0; j < 4; j++)
          this.box(group, [2.75, 0.08, 0.9], [-1.5 + i * 3.05, -0.7 - j * 0.14, 0], i ? c.purple : color);
      });
      group.userData.bounds = [6.4, 3.5, 1.5];
      group.userData.labelOffset.y = 2.25;
      return;
    }
    if (id === 'writer') {
      plate('UidlWriter', (r) => ['NodeChanges → JSON', '{ changes: […],', '  constants: {…} }'], [0, 0.5, 0], 3, {
        height: 1.8
      });
      for (let i = 0; i < 3; i++) link([-1.8, -0.4, 0.2 + i * 0.35], [-0.2, -0.4, 1.2]);
      link([-0.2, -0.4, 1.2], [1.6, -0.4, 1.2]);
      return;
    }
    if (id === 'binder') {
      ['Field', 'Convert', 'Validate'].forEach((title, i) =>
        plate(title, [i === 0 ? '"Ada"' : i === 1 ? 'String → T' : 'valid?'], [(i - 1) * 1.25, 0.3, 0], 1.15, {
          height: 1.1
        })
      );
      link([-1.7, -0.5, 0], [1.8, -0.5, 0]);
      group.userData.bounds = [4.2, 2, 1.5];
      return;
    }
    if (id === 'bean') {
      plate('Person · bean', (r) => ['name = "' + r.bean + '"', 'writeBeanIfValid()'], [0, 0.5, 0], 2.65, {
        height: 1.6
      });
      return;
    }
    if (id === 'database') {
      for (let i = 0; i < 3; i++) {
        const disk = new T.Mesh(new T.CylinderGeometry(1, 1, 0.35, 24), this.material(color));
        disk.position.y = i * 0.42;
        disk.userData.id = id;
        group.add(disk);
        this.pickables.push(disk);
      }
      plate('Application DB', ['optional · not Flow-owned'], [0, 1.4, 0], 2.8, { height: 0.85 });
      plate(
        'orders · example records',
        (r) => [
          'id    customer    total',
          '1001  Ada         €120',
          '1002  Grace        €85',
          '1003  Linus       €210',
          r.queried ? 'SELECT → 3 rows returned' : 'read via your repository'
        ],
        [2.9, 0.6, 0],
        3.7,
        { height: 2.7 }
      );
      group.userData.bounds = [8.3, 4, 2];
      group.userData.focusOffset = [1.35, 0.5, 0];
      group.userData.labelOffset.y = 2.25;
      return;
    }
    if (id === 'provider') {
      plate('DataProvider', ['offset: 0 · limit: 50', 'fetch() → stream of rows'], [0, 0.5, 0], 2.8);
      for (let i = 0; i < 3; i++) this.box(group, [2.3, 0.05, 0.28], [0, -0.45, i * 0.35], color, { opacity: 0.6 });
      return;
    }
    if (id === 'scanner') {
      plate('Discover dependencies', ['@JsModule · @CssImport', '@NpmPackage → metadata'], [0, 0.5, 0], 3.4);
      for (let i = 0; i < 3; i++)
        this.box(group, [1.1, 0.06, 0.9], [-0.9 + i * 0.7, -0.4 - i * 0.09, 0], color, { opacity: 0.6 });
      return;
    }
    if (id === 'build') {
      ['Generate imports', 'Bundle frontend'].forEach((title, i) =>
        plate(title, [i ? 'JS + CSS → assets' : 'Java metadata → JS'], [-0.9 + i * 1.85, 0.5, 0], 1.75, { height: 1.4 })
      );
      link([-1.8, -0.45, 0.7], [1.8, -0.45, 0.7]);
      group.userData.bounds = [4, 2.5, 2];
      return;
    }
    if (id === 'bundle') {
      plate(
        'Browser assets',
        ['app.js · components.js', 'styles.css · Flow client', '≠ Java view objects'],
        [0, 0.5, 0],
        3.3,
        { height: 1.8 }
      );
      return;
    }
    if (id === 'push') {
      plate('Push connection', ['UI.access() → UIDL', 'server → browser'], [0, 0.4, 0], 2.8, { height: 1.3 });
      link([1.4, -0.5, 0], [-1.4, -0.5, 0]);
      return;
    }
    if (id === 'client-engine') {
      plate(
        'Flow client runtime',
        ['MessageHandler → changes', 'StateTree → DOM bindings', 'Execute pending JavaScript'],
        [0, 0.5, 0],
        3.6,
        { height: 1.8 }
      );
    }
  };
  P.paintModels = function (runtime) {
    for (const panel of this.modelPanels) {
      const rows = typeof panel.rows === 'function' ? panel.rows(runtime) : panel.rows;
      const title = typeof panel.title === 'function' ? panel.title(runtime) : panel.title;
      const signature = JSON.stringify([title, rows]);
      if (signature === panel.signature) continue;
      panel.signature = signature;
      const ctx = panel.canvas.getContext('2d'),
        w = panel.canvas.width,
        h = panel.canvas.height;
      ctx.fillStyle = '#112737';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = panel.color;
      ctx.fillRect(0, 0, 8, h);
      ctx.fillStyle = '#1e3a4b';
      ctx.fillRect(8, 0, w - 8, h * 0.28);
      const font = Math.min(48, (w / Math.max(16, title.length)) * 1.55);
      ctx.fillStyle = '#f0f7ff';
      ctx.font = `600 ${font}px system-ui`;
      ctx.fillText(title, 26, h * 0.18, w - 50);
      const rowSize = Math.min(42, (h * 0.65) / Math.max(2, rows.length));
      ctx.font = `${rowSize}px ui-monospace, monospace`;
      rows.forEach((row, i) => {
        const y = h * 0.39 + i * ((h * 0.59) / rows.length);
        if (panel.draw === 'dom') {
          ctx.strokeStyle = panel.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(i ? 45 : 22, y - rowSize * 0.8, w - (i ? 75 : 45), rowSize * 1.28);
        }
        ctx.fillStyle = panel.key === 'dirty' && runtime.dirty && i === rows.length - 1 ? '#ffc97d' : '#c7dfe9';
        ctx.fillText(row, panel.draw === 'dom' ? (i ? 59 : 33) : 26, y, w - 55);
      });
      panel.texture.needsUpdate = true;
    }
  };
  P.projectModelPanels = function () {
    const T = this.T,
      width = this.host.clientWidth,
      height = this.host.clientHeight;
    for (const panel of this.modelPanels) {
      const { face, canvas } = panel;
      const origin = face.getWorldPosition(new T.Vector3());
      const corners = [
        [-1, 1],
        [1, 1],
        [1, -1],
        [-1, -1]
      ].map(([x, y]) => {
        const p = face
          .localToWorld(new T.Vector3((x * panel.width) / 2, (y * panel.height) / 2, 0))
          .project(this.camera);
        return { x: (p.x * 0.5 + 0.5) * width, y: (-0.5 * p.y + 0.5) * height, z: p.z };
      });
      const [p0, p1, p2, p3] = corners,
        dx1 = p1.x - p2.x,
        dx2 = p3.x - p2.x,
        dx3 = p0.x - p1.x + p2.x - p3.x;
      const dy1 = p1.y - p2.y,
        dy2 = p3.y - p2.y,
        dy3 = p0.y - p1.y + p2.y - p3.y,
        den = dx1 * dy2 - dx2 * dy1;
      let visible =
        panel.group.visible &&
        this.camera.position.z > origin.z &&
        Math.abs(den) > 0.01 &&
        corners.every((p) => p.z > 0 && p.z < 1);
      // Overlay text must not show through a nearer object in the software renderer.
      if (visible) {
        this.raycaster.set(this.camera.position, origin.clone().sub(this.camera.position).normalize());
        const hit = this.raycaster
          .intersectObjects(this.pickables, false)
          .find((h) => this.groups.get(h.object.userData.id)?.visible);
        visible = !hit || hit.object === face || hit.distance >= this.camera.position.distanceTo(origin) - 0.16;
      }
      canvas.hidden = !visible;
      if (!visible) continue;
      const g = (dx3 * dy2 - dx2 * dy3) / den,
        h = (dx1 * dy3 - dx3 * dy1) / den;
      const a = p1.x - p0.x + g * p1.x,
        b = p3.x - p0.x + h * p3.x,
        d = p1.y - p0.y + g * p1.y,
        e = p3.y - p0.y + h * p3.y;
      canvas.style.transform = `matrix3d(${a / canvas.width},${d / canvas.width},0,${g / canvas.width},${b / canvas.height},${e / canvas.height},0,${h / canvas.height},0,0,1,0,${p0.x},${p0.y},0,1)`;
      canvas.style.zIndex = String(Math.max(1, Math.round(1000 - this.camera.position.distanceTo(origin) * 10)));
    }
  };
  P.focusObject = function (id) {
    const group = this.groups.get(id);
    if (!group) return;
    if (id === 'second-ui') this.second = true;
    if (window.FLOW_WORLD_DETAILS_CONTENT.objects[id].zone === 'build') this.buildVisible = true;
    group.visible = true;
    clearTimeout(this.actionTimer);
    this.follow = false;
    this.onManualCamera?.();
    this.onSelect(id);
    this.focused = id;
    this.host.dataset.focusedObject = id;
    const size = group.userData.bounds || [6.5, 4.6, 2];
    const target = group.position
      .clone()
      .add(new this.T.Vector3(...(group.userData.focusOffset || [0, id === 'browser' ? 0.3 : 0.5, 0])));
    const vfov = (this.camera.fov * Math.PI) / 180,
      hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const radius =
      Math.max(size[0] / (2 * Math.tan(hfov / 2)), size[1] / (2 * Math.tan(vfov / 2)), size[2]) *
      (id === 'browser' ? 1.45 : 1.65);
    const to = target.clone().add(new this.T.Vector3(0.18, 0.45, 1).normalize().multiplyScalar(Math.max(4, radius)));
    this.cameraTween = {
      start: performance.now(),
      from: this.camera.position.clone(),
      to,
      targetFrom: this.controls.target.clone(),
      targetTo: target
    };
    const contents = {
      heap: ['heap', 'session', 'ui', 'component', 'element', 'server-tree', 'features', 'second-ui'],
      session: ['session', 'ui', 'component', 'element', 'server-tree', 'features', 'second-ui'],
      ui: ['ui', 'component', 'element', 'server-tree', 'features']
    };
    this.focusSet = new Set(contents[id] || [id]);
    this.onFocus?.(id);
  };
  P.createJourney = function () {
    const T = this.T;
    this.routeArrow = new T.Mesh(new T.CylinderGeometry(0, 0.2, 0.6, 8), new T.MeshBasicMaterial({ color: 0xffd590 }));
    this.scene.add(this.routeArrow);
    this.routeArrow.visible = false;
    this.transferLabel = document.createElement('div');
    this.transferLabel.className = 'world-transfer';
    this.transferLabel.hidden = true;
    this.labels.append(this.transferLabel);
    this.journeyLines = [];
  };
  P.setJourney = function (steps, index) {
    this.journeyIndex = index;
    if (this.journeySteps !== steps) {
      this.journeySteps = steps;
      for (const item of this.journeyLines) {
        this.scene.remove(item.line, item.arrow);
        item.line.geometry.dispose();
        item.line.material.dispose();
        item.arrow.geometry.dispose();
        item.arrow.material.dispose();
      }
      this.journeyLines = [];
      const T = this.T;
      for (let i = 1; i < steps.length; i++) {
        if (steps[i - 1].node === steps[i].node) continue;
        const line = new T.Line(
          new T.BufferGeometry(),
          new T.LineBasicMaterial({ color: 0x81abc9, transparent: true, opacity: 0.2 })
        );
        const arrow = new T.Mesh(
          new T.CylinderGeometry(0, 0.12, 0.35, 6),
          new T.MeshBasicMaterial({ color: 0x81abc9, transparent: true, opacity: 0.3 })
        );
        this.scene.add(line, arrow);
        this.journeyLines.push({ line, arrow, from: steps[i - 1].node, to: steps[i].node, index: i });
      }
    }
    const current = steps[index],
      previous = steps[index - 1];
    if (previous) {
      const from = window.FLOW_WORLD_DETAILS_CONTENT.objects[previous.node],
        to = window.FLOW_WORLD_DETAILS_CONTENT.objects[current.node];
      const crossing = previous.node === 'network' || current.node === 'network';
      this.transferLabel.textContent =
        from.zone === 'browser' && to.zone === 'server'
          ? 'RPC → server'
          : from.zone === 'server' && to.zone === 'browser'
            ? 'UIDL → browser'
            : crossing
              ? current.node === 'network'
                ? from.zone === 'browser'
                  ? 'RPC → server'
                  : 'UIDL → browser'
                : to.zone === 'browser'
                  ? 'UIDL → browser'
                  : 'RPC → server'
              : to.zone === 'build'
                ? 'build dependency →'
                : from.zone === 'browser' && to.zone === 'browser'
                  ? 'client processing →'
                  : previous.node === 'bundle'
                    ? 'load assets →'
                    : current.node === 'session'
                      ? 'acquire lock →'
                      : current.node === 'writer'
                        ? 'encode changes →'
                        : 'Java execution →';
    }
  };
  P.placeArrow = function (arrow, curve, t) {
    arrow.position.copy(curve.getPoint(t));
    arrow.quaternion.setFromUnitVectors(new this.T.Vector3(0, 1, 0), curve.getTangent(t).normalize());
  };
  P.updateJourney = function () {
    for (const item of this.journeyLines) {
      const a = this.getPoint(item.from),
        b = this.getPoint(item.to),
        mid = a.clone().lerp(b, 0.5);
      mid.y += Math.min(4, a.distanceTo(b) * 0.22) + 0.6;
      const curve = new this.T.CatmullRomCurve3([a, mid, b]);
      item.line.geometry.setFromPoints(curve.getPoints(24));
      const visible = this.groups.get(item.from).visible && this.groups.get(item.to).visible;
      item.line.visible = visible && !this.focused;
      item.arrow.visible = visible && !this.focused;
      item.line.material.opacity = item.index < this.journeyIndex ? 0.35 : 0.12;
      item.arrow.material.opacity = item.index < this.journeyIndex ? 0.65 : 0.2;
      this.placeArrow(item.arrow, curve, 0.78);
    }
  };
  P.positionTransfer = function (point) {
    point.project(this.camera);
    const x = (point.x * 0.5 + 0.5) * this.host.clientWidth,
      y = (-point.y * 0.5 + 0.5) * this.host.clientHeight;
    this.transferLabel.hidden =
      !this.routeLine.visible ||
      point.z < 0 ||
      point.z > 1 ||
      x < 45 ||
      x > this.host.clientWidth - 45 ||
      y < 140 ||
      y > this.host.clientHeight - 65;
    this.transferLabel.style.transform = `translate(-50%,-100%) translate(${x}px,${y - 10}px)`;
  };
})();
