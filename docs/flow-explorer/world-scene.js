/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  const placements = {
    browser: [-7, 3.4, -0.4],
    dom: [-8.6, 0.6, 3],
    'client-tree': [-5.7, 0.6, 3],
    'client-engine': [-7, 0.7, -2.6],
    queue: [-3.5, 0.65, 1.6],
    network: [-0.6, 1.35, 1.3],
    servlet: [2.7, 0.8, -1.4],
    service: [6.7, 0.55, -3.2],
    heap: [6.3, 2.5, 0.5],
    session: [6.3, 2, 0.6],
    ui: [5.5, 1.45, 0.6],
    component: [4.7, 3.1, 0.1],
    element: [7, 3.15, 0.1],
    'server-tree': [5.6, 0.75, 2.5],
    features: [8.7, 1.35, 2.1],
    writer: [2.7, 0.7, 3.1],
    threads: [10.1, 0.8, -2],
    access: [10.2, 0.8, 0.1],
    push: [2.7, 0.55, 5],
    binder: [7.2, 0.8, 4.9],
    bean: [9.4, 0.8, 4.8],
    provider: [10.2, 0.55, 6.8],
    database: [13.2, 0.85, 4],
    scanner: [-3.7, 0.6, -7],
    build: [-0.3, 0.6, -7],
    bundle: [3.1, 0.6, -7],
    'second-ui': [7.3, 2.5, -1.1]
  };
  const spreads = {
    browser: [-1, 1.5, -1],
    dom: [-1, 0.3, 1],
    'client-tree': [0.3, 1.3, 1],
    'client-engine': [0, 0.8, -1],
    component: [-1, 2.8, 0],
    element: [0.5, 3, 0],
    ui: [0, 0.8, 0],
    'server-tree': [-0.3, 1.2, 1.4],
    features: [1.1, 1.5, 1],
    'second-ui': [1, 1.8, -0.5]
  };
  const primary = new Set([
    'browser',
    'dom',
    'client-tree',
    'network',
    'servlet',
    'session',
    'heap',
    'second-ui',
    'component',
    'server-tree',
    'threads',
    'writer',
    'build',
    'database'
  ]);
  const relationships = [
    ['browser', 'dom'],
    ['dom', 'client-tree'],
    ['client-tree', 'client-engine'],
    ['dom', 'queue'],
    ['servlet', 'session'],
    ['service', 'component'],
    ['ui', 'component'],
    ['component', 'element'],
    ['element', 'server-tree'],
    ['server-tree', 'features'],
    ['server-tree', 'writer'],
    ['threads', 'access'],
    ['access', 'session'],
    ['binder', 'bean'],
    ['provider', 'database'],
    ['scanner', 'build'],
    ['build', 'bundle']
  ];
  const presets = {
    overview: { position: [14.5, 13.5, 24], target: [1.7, 1.5, 0] },
    browser: { position: [-8, 7, 15], target: [-6.7, 2, 0] },
    runtime: { position: [12, 13, 22], target: [1, 1.6, 1.5] },
    memory: { position: [17, 12, 17], target: [6.5, 2.2, 0.8] },
    build: { position: [7, 10, 6], target: [-0.4, 0.8, -7] }
  };
  function readPalette() {
    const el = document.createElement('span');
    document.body.append(el);
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const result = {};
    for (const [name, token] of Object.entries({
      blue: '--accent',
      green: '--success',
      purple: '--purple',
      orange: '--orange',
      dark: '--sidebar-bg',
      paper: '--paper'
    })) {
      el.style.color = `var(${token})`;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = getComputedStyle(el).color;
      ctx.fillRect(0, 0, 1, 1);
      result[name] =
        '#' +
        [...ctx.getImageData(0, 0, 1, 1).data]
          .slice(0, 3)
          .map((n) => n.toString(16).padStart(2, '0'))
          .join('');
    }
    el.remove();
    return result;
  }
  class RuntimeScene {
    constructor(host, labels, onSelect, onAction) {
      this.T = window.FLOW_3D;
      const T = this.T;
      this.host = host;
      this.labels = labels;
      this.onSelect = onSelect;
      this.onAction = onAction;
      this.palette = readPalette();
      this.groups = new Map();
      this.pickables = [];
      this.lines = [];
      this.explode = 0;
      this.targetExplode = 0;
      this.selected = 'browser';
      this.active = 'browser';
      this.view = 'overview';
      this.second = false;
      this.buildVisible = true;
      this.disposed = false;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.abort = new AbortController();
      try {
        this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch {
        this.software = true;
        this.renderer = new T.SVGRenderer();
        this.renderer.setClearColor(this.palette.dark);
        this.renderer.setPrecision(2);
      }
      this.renderer.domElement.dataset.renderer = this.software ? 'software' : 'webgl';
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;
      this.renderer.domElement.setAttribute(
        'aria-label',
        '3D Flow runtime. Drag to orbit; scroll to zoom. Use the object selector for keyboard inspection.'
      );
      this.renderer.domElement.tabIndex = 0;
      host.append(this.renderer.domElement);
      this.scene = new T.Scene();
      this.scene.fog = new T.Fog(this.palette.dark, 45, 95);
      this.camera = new T.PerspectiveCamera(42, 1, 0.1, 140);
      this.camera.position.set(...presets.overview.position);
      this.controls = new T.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.set(...presets.overview.target);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.1;
      this.controls.minDistance = 6;
      this.controls.maxDistance = 65;
      this.controls.maxPolarAngle = Math.PI * 0.47;
      this.controls.minPolarAngle = 0.15;
      this.controls.addEventListener('start', () => {
        this.cameraTween = null;
        this.follow = false;
        this.onManualCamera?.();
      });
      this.scene.add(new T.HemisphereLight(0xd7e4ff, 0x203b45, 2.5));
      if (this.software) this.scene.add(new T.AmbientLight(0xffffff, 0.6));
      const light = new T.DirectionalLight(0xffffff, this.software ? 0.85 : 3);
      light.position.set(-10, 20, 10);
      this.scene.add(light);
      const rim = new T.DirectionalLight(this.palette.blue, this.software ? 0.45 : 2.5);
      rim.position.set(10, 10, -15);
      this.scene.add(rim);
      const floor = new T.GridHelper(70, 70, 0x405277, 0x263348);
      floor.material.transparent = true;
      floor.material.opacity = this.software ? 0.2 : 0.33;
      if (this.software) floor.material.color.set(0x405277);
      floor.position.y = -0.18;
      this.scene.add(floor);
      this.createPlatforms();
      this.createObjects();
      this.createConnections();
      this.createPacket();
      this.raycaster = new T.Raycaster();
      this.pointer = new T.Vector2();
      this.bindPointers();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(host);
      this.resize();
      this.startTime = performance.now();
      this.lastTime = this.startTime;
      this.frame = requestAnimationFrame((t) => this.animate(t));
    }
    material(color, opacity = 1) {
      return new this.T.MeshStandardMaterial({
        color,
        roughness: 0.6,
        metalness: 0.16,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity >= 1
      });
    }
    box(parent, size, position, color, options = {}) {
      const T = this.T,
        geometry = new T.BoxGeometry(...size),
        material = this.material(color, options.opacity ?? 1);
      const mesh = new T.Mesh(geometry, material);
      mesh.position.set(...position);
      parent.add(mesh);
      if (options.edges !== false) {
        const edges = new T.LineSegments(
          new T.EdgesGeometry(geometry),
          new T.LineBasicMaterial({
            color: options.edge || color,
            transparent: true,
            opacity: options.opacity < 1 ? 0.6 : 0.38
          })
        );
        mesh.add(edges);
      }
      if (parent.userData.id && options.pick !== false) {
        mesh.userData.id = parent.userData.id;
        this.pickables.push(mesh);
      }
      return mesh;
    }
    createPlatforms() {
      const T = this.T;
      for (const [x, z, w, d, c] of [
        [-6.4, 0.3, 10, 8, this.palette.blue],
        [6.4, 1.4, 10.8, 11.7, this.palette.green],
        [-0.3, -7, 11, 3.4, this.palette.purple],
        [13.3, 4, 3.2, 3.5, this.palette.orange]
      ]) {
        const platform = new T.Group();
        platform.position.set(x, -0.22, z);
        this.scene.add(platform);
        this.box(platform, [w, 0.2, d], [0, 0, 0], c, { opacity: 0.1, edge: c });
        this.box(platform, [w, 0.06, 0.045], [0, 0.14, d / 2], c, { edges: false });
      }
    }
    addGroup(id) {
      const group = new this.T.Group();
      group.userData.id = id;
      group.position.set(...placements[id]);
      this.scene.add(group);
      this.groups.set(id, group);
      const label = document.createElement('button');
      label.className = 'world-label';
      label.dataset.worldSelect = id;
      label.innerHTML = `<i></i><span>${window.FLOW_WORLD_CONTENT.objects[id].title}</span>`;
      label.addEventListener('click', () => this.onSelect(id), { signal: this.abort.signal });
      this.labels.append(label);
      group.userData.label = label;
      group.userData.labelOffset = new this.T.Vector3(0, 1.15, 0);
      return group;
    }
    createObjects() {
      const T = this.T,
        c = this.palette;
      for (const id of Object.keys(placements)) {
        const group = this.addGroup(id);
        const zone = window.FLOW_WORLD_CONTENT.objects[id].zone;
        const color =
          zone === 'browser'
            ? c.blue
            : zone === 'build'
              ? c.purple
              : zone === 'network' || zone === 'application'
                ? c.orange
                : c.green;
        if (id === 'browser') {
          this.createBrowser(group);
          continue;
        }
        if (id === 'heap' || id === 'session') {
          this.box(group, id === 'heap' ? [8.3, 5, 6.7] : [6.9, 3.5, 4.7], [0, 0, 0], color, {
            opacity: id === 'heap' ? 0.025 : 0.035,
            edge: id === 'heap' ? 0x658993 : color,
            pick: false
          });
          group.userData.labelOffset.set(id === 'heap' ? 1 : -3, id === 'heap' ? 3.25 : 2.1, id === 'heap' ? -2 : 1);
          if (id === 'session') this.createLock(group);
          continue;
        }
        if (['dom', 'client-tree', 'server-tree', 'component', 'second-ui'].includes(id)) {
          this.createTree(group, color, id === 'component');
          group.userData.labelOffset.y = 1.7;
          if (id === 'second-ui') group.scale.setScalar(0.63);
          continue;
        }
        if (id === 'ui') {
          this.box(group, [3.9, 0.16, 2.8], [0, -0.1, 0], c.green, { opacity: 0.2 });
          group.userData.labelOffset.set(-1.8, 0.15, 1.6);
          continue;
        }
        if (id === 'network') {
          const ring = new T.Mesh(new T.TorusGeometry(0.63, 0.045, 8, 40), this.material(color));
          ring.rotation.y = -0.25;
          ring.userData.id = id;
          this.pickables.push(ring);
          group.add(ring);
          const inner = new T.Mesh(new T.SphereGeometry(0.14, 12, 8), new T.MeshBasicMaterial({ color }));
          group.add(inner);
          group.userData.labelOffset.y = 1;
          continue;
        }
        if (id === 'database') {
          for (let i = 0; i < 3; i++) {
            const mesh = new T.Mesh(new T.CylinderGeometry(0.85, 0.85, 0.43, 32), this.material(0x799aa5));
            mesh.position.y = i * 0.48;
            group.add(mesh);
            mesh.userData.id = id;
            this.pickables.push(mesh);
            const rim = new T.Mesh(new T.TorusGeometry(0.84, 0.022, 6, 36), new T.MeshBasicMaterial({ color }));
            rim.rotation.x = Math.PI / 2;
            rim.position.y = i * 0.48 + 0.22;
            group.add(rim);
          }
          group.userData.labelOffset.y = 2;
          continue;
        }
        if (id === 'threads') {
          for (let i = 0; i < 3; i++) {
            this.box(group, [2.7, 0.13, 0.55], [0, i * 0.42, 0], 0x41596f);
            for (let j = 0; j < 3; j++)
              this.box(
                group,
                [0.57, 0.23, 0.38],
                [-0.86 + j * 0.83, i * 0.42 + 0.18, 0],
                i === 0 ? c.orange : c.purple,
                { opacity: 0.9 }
              );
          }
          group.userData.labelOffset.y = 1.8;
          continue;
        }
        if (id === 'access' || id === 'queue') {
          this.box(group, [1.9, 0.1, 0.9], [0, -0.15, 0], color, { opacity: 0.25 });
          for (let i = 0; i < 3; i++)
            this.box(group, [0.38, 0.5, 0.55], [-0.62 + i * 0.62, 0.18, 0], color, { opacity: 0.8 });
          continue;
        }
        if (id === 'features') {
          for (let i = 0; i < 3; i++)
            this.box(
              group,
              [0.52, 0.4, 0.5],
              [(i - 1) * 0.68, Math.abs(i - 1) * 0.25, 0],
              [c.blue, c.purple, c.orange][i]
            );
          continue;
        }
        if (id === 'binder') {
          for (let i = 0; i < 3; i++)
            this.box(group, [0.55, 0.42, 0.8], [(i - 1) * 0.72, 0, 0], [c.blue, c.purple, c.green][i]);
          continue;
        }
        if (id === 'bean') {
          this.box(group, [1, 0.85, 0.75], [0, 0.1, 0], 0xcce6df);
          for (let i = 0; i < 3; i++)
            this.box(group, [0.62, 0.06, 0.025], [0, 0.32 - i * 0.19, 0.39], c.green, { edges: false });
          continue;
        }
        const isBuild = zone === 'build';
        this.box(group, [isBuild ? 2.25 : 1.8, 0.65, isBuild ? 1.7 : 1.2], [0, 0, 0], isBuild ? 0x7c74af : 0x548c88);
        this.box(group, [isBuild ? 1.8 : 1.4, 0.04, isBuild ? 1.24 : 0.78], [0, 0.35, 0], color, { opacity: 0.8 });
        for (let i = 0; i < 3; i++)
          this.box(group, [0.1, 0.08, 0.09], [-0.42 + i * 0.28, 0.09, isBuild ? 0.88 : 0.62], 0xccfff4, {
            edges: false
          });
      }
      // The chassis is visual context; it is not a modeled heap address space.
      const rack = new T.Group();
      rack.position.set(9, 0.9, -4.1);
      this.scene.add(rack);
      for (let i = 0; i < 3; i++) this.box(rack, [2.2, 0.42, 1.2], [0, i * 0.52, 0], 0x34465b, { edge: 0x7794a0 });
      this.groups.get('second-ui').visible = false;
    }
    createLock(parent) {
      const T = this.T;
      this.lock = new T.Group();
      this.lock.position.set(-3.05, -0.4, 2.45);
      parent.add(this.lock);
      this.lockBody = this.box(this.lock, [0.62, 0.5, 0.35], [0, 0, 0], this.palette.green);
      this.lockRing = new T.Mesh(new T.TorusGeometry(0.23, 0.055, 8, 22), this.material(this.palette.green));
      this.lockRing.position.set(0, 0.39, 0);
      this.lock.add(this.lockRing);
    }
    createTree(group, color, vertical = false) {
      const coords = vertical
        ? [
            [0, 1, 0],
            [-0.85, 0.15, 0],
            [0.85, 0.15, 0]
          ]
        : [
            [0, 0.4, -0.65],
            [-0.8, 0.15, 0.55],
            [0.8, 0.15, 0.55]
          ];
      this.box(group, [2.55, 0.06, 2.15], [0, -0.2, 0], color, { opacity: 0.09, pick: false });
      const boxes = [];
      for (const p of coords) boxes.push(this.box(group, [0.67, 0.43, 0.59], p, color));
      for (let i = 1; i < 3; i++) {
        const geometry = new this.T.BufferGeometry().setFromPoints([
          new this.T.Vector3(...coords[0]),
          new this.T.Vector3(...coords[i])
        ]);
        group.add(new this.T.Line(geometry, new this.T.LineBasicMaterial({ color, transparent: true, opacity: 0.8 })));
      }
      group.userData.treeBoxes = boxes;
    }
    createBrowser(group) {
      const T = this.T;
      this.box(group, [6, 3.95, 0.23], [0, 0.3, 0], 0x6d819c, { edge: 0xb9c9e5 });
      this.box(group, [0.3, 1.2, 0.3], [0, -2.2, -0.12], 0x53667e);
      this.box(group, [2.5, 0.12, 1.2], [0, -2.77, 0], 0x718198);
      this.screenCanvas = document.createElement('canvas');
      this.screenCanvas.width = 1200;
      this.screenCanvas.height = 760;
      this.screenTexture = new T.CanvasTexture(this.screenCanvas);
      this.screenTexture.colorSpace = T.SRGBColorSpace;
      this.screenTexture.anisotropy = Math.min(4, this.renderer.capabilities?.getMaxAnisotropy() || 1);
      const screen = new T.Mesh(
        new T.PlaneGeometry(5.74, 3.65),
        new T.MeshBasicMaterial({ map: this.screenTexture, toneMapped: false })
      );
      screen.position.set(0, 0.3, 0.125);
      screen.userData.id = 'browser';
      screen.userData.screen = true;
      group.add(screen);
      this.pickables.push(screen);
      if (this.software) {
        // SVGRenderer projects the same geometry but does not support textures.
        // Project the application's canvas onto the monitor with a homography.
        this.screenCanvas.className = 'world-software-screen';
        this.screenCanvas.setAttribute('aria-hidden', 'true');
        this.host.append(this.screenCanvas);
      }
      group.userData.labelOffset.set(0, 2.75, 0);
      this.paintBrowser({ client: 7, server: 7, clientRoute: '/counter', route: '/counter' });
    }
    paintBrowser(runtime) {
      const signature = JSON.stringify([
        runtime.client,
        runtime.clientRoute,
        runtime.form,
        runtime.draft,
        runtime.saved,
        this.second
      ]);
      if (signature === this.screenSignature) return;
      this.screenSignature = signature;
      const ctx = this.screenCanvas.getContext('2d'),
        c = this.palette;
      ctx.fillStyle = '#f5f7fb';
      ctx.fillRect(0, 0, 1200, 760);
      ctx.fillStyle = '#e2e7f0';
      ctx.fillRect(0, 0, 1200, 92);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(35 + i * 30, 29, 7, 0, Math.PI * 2);
        ctx.fillStyle = ['#8099ba', '#aec0d7', '#c6d1df'][i];
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(150, 17, 910, 53);
      ctx.fillStyle = '#536079';
      ctx.font = '22px system-ui';
      ctx.fillText('counter.example' + (runtime.clientRoute || '/counter'), 175, 52);
      ctx.fillStyle = '#e8edf7';
      ctx.fillRect(0, 92, 195, 668);
      ctx.fillStyle = c.blue;
      ctx.font = 'bold 31px system-ui';
      ctx.fillText('flow app', 28, 146);
      ctx.font = '24px system-ui';
      ctx.fillStyle = '#5d6d89';
      ctx.fillText('Overview', 28, 222);
      ctx.fillText('Orders', 28, 278);
      ctx.fillText('Settings', 28, 334);
      ctx.fillStyle = '#283852';
      ctx.font = 'bold 40px system-ui';
      ctx.fillText(
        runtime.form ? 'Edit profile' : runtime.clientRoute === '/orders' ? 'Orders' : 'A tiny counter',
        245,
        166
      );
      ctx.fillStyle = '#6b7a92';
      ctx.font = '23px system-ui';
      ctx.fillText('Java on the server. A living UI in the browser.', 245, 214);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(245, 262, 870, 350);
      ctx.fillStyle = '#6b7a92';
      ctx.font = '21px system-ui';
      ctx.fillText(
        runtime.form ? 'NAME' : runtime.clientRoute === '/orders' ? 'CURRENT VIEW' : 'CURRENT VALUE',
        285,
        307
      );
      ctx.fillStyle = '#233653';
      ctx.font = runtime.form ? 'bold 70px system-ui' : 'bold 115px system-ui';
      ctx.fillText(
        runtime.form ? runtime.draft || '' : runtime.clientRoute === '/orders' ? 'Orders' : String(runtime.client),
        285,
        440
      );
      ctx.fillStyle = c.blue;
      ctx.fillRect(285, 482, 346, 76);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 27px system-ui';
      ctx.fillText(
        runtime.form ? 'Validate profile' : runtime.clientRoute === '/orders' ? 'Load orders' : 'Click me  +1',
        325,
        531
      );
      ctx.fillStyle = '#6b7a92';
      ctx.font = '20px system-ui';
      ctx.fillText('SIMULATED APPLICATION  ·  Click the blue button', 245, 685);
      if (this.second) {
        ctx.fillStyle = c.green;
        ctx.font = '20px system-ui';
        ctx.fillText('Tab 2 → separate UI', 858, 46);
      }
      this.screenTexture.needsUpdate = true;
    }
    createConnections() {
      const T = this.T;
      for (const [from, to] of relationships) {
        const line = new T.Line(
          new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
          new T.LineBasicMaterial({ color: 0x6f8daa, transparent: true, opacity: 0.28 })
        );
        this.scene.add(line);
        this.lines.push({ from, to, line });
      }
      this.routeLine = new T.Line(
        new T.BufferGeometry(),
        new T.LineBasicMaterial({ color: this.palette.blue, transparent: true, opacity: 0.65 })
      );
      this.scene.add(this.routeLine);
    }
    createPacket() {
      const T = this.T;
      this.packet = new T.Group();
      this.packet.add(new T.Mesh(new T.SphereGeometry(0.16, 12, 8), new T.MeshBasicMaterial({ color: 0xe3f4ff })));
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(130,185,255,.9)');
      gradient.addColorStop(0.3, 'rgba(90,145,255,.4)');
      gradient.addColorStop(1, 'rgba(80,130,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      const glow = new T.Sprite(
        new T.SpriteMaterial({
          map: new T.CanvasTexture(canvas),
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false
        })
      );
      glow.scale.set(1.5, 1.5, 1.5);
      this.packet.add(glow);
      glow.visible = !this.software;
      this.scene.add(this.packet);
      this.packet.visible = false;
    }
    getPoint(id) {
      return this.groups
        .get(id)
        .position.clone()
        .add(new this.T.Vector3(0, 0.4, 0));
    }
    setPhase(from, to, progress, playing) {
      this.phaseFrom = from;
      this.active = to;
      this.progress = progress;
      this.playing = playing;
    }
    setView(name) {
      this.view = name;
      const preset = presets[name] || presets.overview;
      this.cameraTween = {
        start: performance.now(),
        from: this.camera.position.clone(),
        to: new this.T.Vector3(...preset.position),
        targetFrom: this.controls.target.clone(),
        targetTo: new this.T.Vector3(...preset.target)
      };
    }
    setSelected(id) {
      this.selected = id;
    }
    setOptions({ explode, second, buildVisible, follow }) {
      if (explode !== undefined) this.targetExplode = explode;
      if (second !== undefined) this.second = second;
      if (buildVisible !== undefined) this.buildVisible = buildVisible;
      if (follow !== undefined) this.follow = follow;
    }
    setRuntime(runtime) {
      this.runtime = runtime;
      this.paintBrowser(runtime);
      if (this.lock) {
        this.lockBody.material.color.set(runtime.locked ? this.palette.orange : this.palette.green);
        this.lockRing.material.color.set(runtime.locked ? this.palette.orange : this.palette.green);
        this.lockRing.position.y = runtime.locked ? 0.31 : 0.5;
        this.lockRing.rotation.y = runtime.locked ? 0 : 0.65;
      }
    }
    resize() {
      const { width, height } = this.host.getBoundingClientRect();
      if (!width || !height) return;
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      // Preserve the overview's horizontal field of view on narrow screens.
      this.camera.fov = Math.min(
        80,
        (2 * Math.atan(Math.tan((21 * Math.PI) / 180) * Math.max(1, 1.3 / this.camera.aspect)) * 180) / Math.PI
      );
      this.camera.updateProjectionMatrix();
    }
    bindPointers() {
      const canvas = this.renderer.domElement,
        signal = this.abort.signal;
      canvas.addEventListener(
        'dblclick',
        (event) => {
          clearTimeout(this.actionTimer);
          const hit = this.hitTest(event);
          if (hit) this.focusObject(hit.object.userData.id);
        },
        { signal }
      );
      canvas.addEventListener(
        'pointerdown',
        (event) => {
          this.down = { x: event.clientX, y: event.clientY };
        },
        { signal }
      );
      canvas.addEventListener(
        'pointerup',
        (event) => {
          if (!this.down || Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 5) return;
          const hit = this.hitTest(event);
          if (!hit) return;
          if (hit.object.userData.screen && hit.uv.x > 0.23 && hit.uv.x < 0.54 && hit.uv.y > 0.26 && hit.uv.y < 0.38) {
            clearTimeout(this.actionTimer);
            this.actionTimer = setTimeout(
              () =>
                this.onAction(
                  this.runtime?.form ? 'binding' : this.runtime?.clientRoute === '/orders' ? 'data' : 'click'
                ),
              400
            );
            return;
          }
          this.onSelect(hit.object.userData.id);
        },
        { signal }
      );
      canvas.addEventListener(
        'pointermove',
        (event) => {
          canvas.style.cursor = this.hitTest(event) ? 'pointer' : 'grab';
        },
        { signal }
      );
      canvas.addEventListener(
        'keydown',
        (event) => {
          if (event.target !== canvas) return;
          if (event.key === 'Enter') this.focusObject(this.selected);
          if (event.key === 'r' || event.key === 'Home') {
            event.preventDefault();
            this.setView('overview');
          }
          if (event.key === '+' || event.key === '=' || event.key === '-') {
            event.preventDefault();
            this.cameraTween = null;
            this.camera.position
              .sub(this.controls.target)
              .multiplyScalar(event.key === '-' ? 1.12 : 0.89)
              .add(this.controls.target);
          }
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            this.cameraTween = null;
            const offset = this.camera.position.clone().sub(this.controls.target),
              radius = offset.length();
            let azimuth = Math.atan2(offset.x, offset.z),
              polar = Math.acos(offset.y / radius);
            azimuth += event.key === 'ArrowLeft' ? -0.12 : event.key === 'ArrowRight' ? 0.12 : 0;
            polar = Math.max(
              0.15,
              Math.min(Math.PI * 0.47, polar + (event.key === 'ArrowUp' ? -0.1 : event.key === 'ArrowDown' ? 0.1 : 0))
            );
            this.camera.position
              .set(
                radius * Math.sin(polar) * Math.sin(azimuth),
                radius * Math.cos(polar),
                radius * Math.sin(polar) * Math.cos(azimuth)
              )
              .add(this.controls.target);
          }
        },
        { signal }
      );
      canvas.addEventListener(
        'webglcontextlost',
        (event) => {
          event.preventDefault();
          this.onContextLost?.();
        },
        { signal }
      );
    }
    hitTest(event) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);
      return this.raycaster
        .intersectObjects(this.pickables, false)
        .find((hit) => this.groups.get(hit.object.userData.id)?.visible);
    }
    animate(time) {
      if (this.disposed) return;
      this.frame = requestAnimationFrame((t) => this.animate(t));
      if (document.hidden) return;
      if (this.software && time - this.lastTime < 1000 / 24) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.06);
      this.lastTime = time;
      this.explode += (this.targetExplode - this.explode) * (this.reduced ? 1 : Math.min(1, dt * 7));
      for (const [id, group] of this.groups) {
        const base = placements[id],
          spread = spreads[id] || [0, 0, 0];
        group.position.set(...base).addScaledVector(new this.T.Vector3(...spread), this.explode);
        const zone = window.FLOW_WORLD_CONTENT.objects[id].zone;
        group.visible = (id !== 'second-ui' || this.second) && (zone !== 'build' || this.buildVisible);
        this.applyLearningVisibility?.(id, group);
        if (id === 'heap') group.scale.y = 1 + this.explode * 0.45;
        if (id === 'session') group.scale.y = 1 + this.explode * 0.48;
        group.traverse((child) => {
          if (child.material?.emissive) {
            const active = id === this.active,
              selected = id === this.selected;
            child.material.emissive.set(active ? this.palette.blue : selected ? this.palette.green : 0x000000);
            child.material.emissiveIntensity = active
              ? 0.18 + (this.playing && !this.reduced ? Math.sin(time * 0.004) * 0.12 : 0)
              : selected
                ? 0.1
                : 0;
            if (this.software) child.material.emissive.multiplyScalar(child.material.emissiveIntensity);
          }
        });
      }
      if (this.runtime?.dirty) {
        for (const mesh of this.groups.get('server-tree').userData.treeBoxes)
          mesh.material.emissive.set(this.palette.orange);
      }
      for (const { from, to, line } of this.lines) {
        line.visible = this.groups.get(from).visible && this.groups.get(to).visible;
        const a = this.getPoint(from),
          b = this.getPoint(to),
          positions = line.geometry.attributes.position;
        positions.setXYZ(0, a.x, a.y, a.z);
        positions.setXYZ(1, b.x, b.y, b.z);
        positions.needsUpdate = true;
        line.geometry.computeBoundingSphere();
      }
      if (this.phaseFrom && this.active && this.phaseFrom !== this.active) {
        const a = this.getPoint(this.phaseFrom),
          b = this.getPoint(this.active),
          mid = a.clone().lerp(b, 0.5);
        mid.y += Math.min(4, a.distanceTo(b) * 0.22) + 0.6;
        const curve = new this.T.CatmullRomCurve3([a, mid, b]);
        this.routeLine.geometry.setFromPoints(curve.getPoints(40));
        this.routeLine.visible = true;
        this.packet.visible = true;
        this.packet.position.copy(curve.getPoint(this.reduced ? 1 : Math.min(1, this.progress || 0)));
        if (this.follow && this.playing && !this.reduced) {
          const desired = this.packet.position.clone().add(new this.T.Vector3(7, 6, 11));
          this.camera.position.lerp(desired, dt * 1.5);
          this.controls.target.lerp(this.packet.position, dt * 2);
        }
      } else {
        this.routeLine.visible = false;
        this.packet.visible = false;
      }
      if (this.cameraTween) {
        const tween = this.cameraTween,
          t = this.reduced ? 1 : Math.min(1, (time - tween.start) / 1050),
          ease = 1 - Math.pow(1 - t, 3);
        this.camera.position.lerpVectors(tween.from, tween.to, ease);
        this.controls.target.lerpVectors(tween.targetFrom, tween.targetTo, ease);
        if (t === 1) this.cameraTween = null;
      }
      this.controls.update();
      this.updateLearningVisuals?.(dt);
      this.renderer.render(this.scene, this.camera);
      if (this.software) this.projectBrowserScreen();
      this.positionLabels();
    }
    projectBrowserScreen() {
      const width = this.host.clientWidth,
        height = this.host.clientHeight;
      const origin = this.groups.get('browser').position;
      const corners = [
        [-2.87, 2.125],
        [2.87, 2.125],
        [2.87, -1.525],
        [-2.87, -1.525]
      ].map(([x, y]) => {
        const p = origin
          .clone()
          .add(new this.T.Vector3(x, y, 0.126))
          .project(this.camera);
        return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height, z: p.z };
      });
      const [p0, p1, p2, p3] = corners;
      const dx1 = p1.x - p2.x,
        dx2 = p3.x - p2.x,
        dx3 = p0.x - p1.x + p2.x - p3.x;
      const dy1 = p1.y - p2.y,
        dy2 = p3.y - p2.y,
        dy3 = p0.y - p1.y + p2.y - p3.y;
      const denominator = dx1 * dy2 - dx2 * dy1;
      const visible =
        this.camera.position.z > origin.z && corners.every((p) => p.z > 0 && p.z < 1) && Math.abs(denominator) > 0.01;
      this.screenCanvas.hidden = !visible;
      if (!visible) return;
      const g = (dx3 * dy2 - dx2 * dy3) / denominator,
        h = (dx1 * dy3 - dx3 * dy1) / denominator;
      const a = p1.x - p0.x + g * p1.x,
        b = p3.x - p0.x + h * p3.x;
      const d = p1.y - p0.y + g * p1.y,
        e = p3.y - p0.y + h * p3.y;
      this.screenCanvas.style.transform = `matrix3d(${a / 1200},${d / 1200},0,${g / 1200},${b / 760},${e / 760},0,${h / 760},0,0,1,0,${p0.x},${p0.y},0,1)`;
    }
    positionLabels() {
      const width = this.host.clientWidth,
        height = this.host.clientHeight;
      const taken = [];
      // Keep labels for objects behind the monitor off the interactive screen.
      const monitor = this.groups.get('browser').position;
      const corners = [
        [-3, -1.6],
        [3, -1.6],
        [-3, 2.2],
        [3, 2.2]
      ].map(([x, y]) => {
        const p = monitor
          .clone()
          .add(new this.T.Vector3(x, y, 0.14))
          .project(this.camera);
        return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height };
      });
      const screenBounds = {
        left: Math.min(...corners.map((p) => p.x)),
        right: Math.max(...corners.map((p) => p.x)),
        top: Math.min(...corners.map((p) => p.y)),
        bottom: Math.max(...corners.map((p) => p.y))
      };
      // Active and selected objects get first choice of label space.
      const sorted = [...this.groups].sort(
        ([a], [b]) =>
          (b === this.active || b === this.selected
            ? 10
            : ['heap', 'session', 'build', 'second-ui'].includes(b)
              ? 5
              : 0) -
          (a === this.active || a === this.selected
            ? 10
            : ['heap', 'session', 'build', 'second-ui'].includes(a)
              ? 5
              : 0)
      );
      for (const [id, group] of sorted) {
        const label = group.userData.label,
          zone = window.FLOW_WORLD_CONTENT.objects[id].zone;
        const relevant =
          this.view === 'browser'
            ? zone === 'browser'
            : this.view === 'memory'
              ? zone === 'server'
              : this.view === 'build'
                ? zone === 'build'
                : primary.has(id);
        const essential = id === this.selected || id === this.active;
        const point = group.position.clone().add(group.userData.labelOffset);
        point.project(this.camera);
        const x = (point.x * 0.5 + 0.5) * width,
          y = (-point.y * 0.5 + 0.5) * height;
        const inBounds = point.z < 1 && point.z > -1 && x > 45 && x < width - 45 && y > 25 && y < height - 45;
        const overlaps = taken.some((box) => Math.abs(x - box.x) < 135 && Math.abs(y - box.y) < 33);
        const coversScreen =
          id !== 'browser' &&
          x > screenBounds.left - 50 &&
          x < screenBounds.right + 50 &&
          y > screenBounds.top &&
          y < screenBounds.bottom + 20;
        const show = group.visible && inBounds && (essential || (relevant && !overlaps && !coversScreen));
        label.hidden = !show;
        if (!show) continue;
        taken.push({ x, y });
        label.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`;
        label.classList.toggle('is-active', id === this.active);
        label.classList.toggle('is-selected', id === this.selected);
        label.dataset.zone = zone;
      }
    }
    dispose() {
      this.disposed = true;
      cancelAnimationFrame(this.frame);
      this.abort.abort();
      clearTimeout(this.actionTimer);
      this.resizeObserver.disconnect();
      this.controls.dispose();
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      this.scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : object.material
            ? [object.material]
            : []) {
          materials.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
      });
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      this.renderer.dispose?.();
      this.renderer.forceContextLoss?.();
      this.renderer.domElement.remove();
      if (this.software) this.screenCanvas.remove();
      this.labels.replaceChildren();
    }
  }
  window.FLOW_RUNTIME_SCENE = RuntimeScene;
})();
