/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  const detail = window.FLOW_RUNTIME_DETAILS_SCENE.prototype;
  const overview = window.FLOW_RUNTIME_SCENE.prototype;
  const focus = detail.focusObject;
  const parents = {
    session: 'heap',
    ui: 'session',
    component: 'ui',
    element: 'component',
    'server-tree': 'ui',
    features: 'server-tree',
    dom: 'browser',
    'client-tree': 'browser',
    'client-engine': 'browser',
    queue: 'browser'
  };
  const relations = {
    browser: ['dom', 'client-tree', 'client-engine', 'queue'],
    heap: ['session', 'ui', 'component', 'element', 'server-tree', 'features', 'bean'],
    session: ['ui', 'component', 'element', 'server-tree', 'features', 'second-ui'],
    ui: ['component', 'element', 'server-tree', 'features'],
    component: ['element', 'server-tree', 'features'],
    element: ['server-tree', 'features'],
    'server-tree': ['features'],
    threads: ['component', 'ui', 'session'],
    database: ['provider', 'bean'],
    binder: ['bean'],
    'client-tree': ['dom']
  };
  for (const proto of [overview, detail]) {
    proto.focusObject = function (id) {
      const group = this.groups.get(id);
      if (!group) return;
      if (!group.userData.bounds)
        group.userData.bounds = id === 'heap' ? [13, 6, 10] : id === 'session' ? [10, 5, 8] : [5, 4, 2];
      const notify = this.onFocus;
      this.onFocus = null;
      focus.call(this, id);
      this.onFocus = notify;
      this.focusSet = new Set([id, ...(relations[id] || [])]);
      this.contextSet = new Set(this.focusSet);
      let parent = parents[id];
      while (parent) {
        this.contextSet.add(parent);
        parent = parents[parent];
      }
      this.onFocus?.(id);
    };
    const setView = proto.setView;
    proto.setView = function (name) {
      this.focused = null;
      this.focusSet = null;
      this.contextSet = null;
      delete this.host.dataset.focusedObject;
      this.onFocusReset?.();
      setView.call(this, name);
      if (name === 'overview' && this.cameraTween)
        this.cameraTween.to.sub(this.cameraTween.targetTo).multiplyScalar(0.76).add(this.cameraTween.targetTo);
    };
    const createPlatforms = proto.createPlatforms;
    proto.createPlatforms = function () {
      const before = new Set(this.scene.children);
      createPlatforms.call(this);
      this.labPlatforms = this.scene.children.filter((c) => !before.has(c));
    };
    const createObjects = proto.createObjects;
    proto.createObjects = function () {
      createObjects.call(this);
      if (proto === overview) {
        for (const [id, g] of this.groups) {
          g.userData.label.addEventListener('dblclick', () => this.focusObject(id), { signal: this.abort.signal });
          g.userData.label.title = 'Click to inspect · Double-click to open';
        }
      }
      this.traceLines = [];
      if (proto === overview)
        this.groups.get('heap').userData.label.querySelector('span').textContent = 'Java server · heap';
      const chain = ['component', 'element', 'server-tree', 'features', 'client-tree', 'dom'];
      for (let i = 1; i < chain.length; i++) {
        const line = new this.T.Line(
          new this.T.BufferGeometry(),
          new this.T.LineBasicMaterial({
            color: 0xffd590,
            transparent: true,
            opacity: 0.85
          })
        );
        this.scene.add(line);
        this.traceLines.push({ line, from: chain[i - 1], to: chain[i] });
      }
    };
    proto.applyLearningVisibility = function (id, group) {
      if (this.revealed && !this.revealed.has(id) && !this.contextSet?.has(id) && !this.traceSet?.has(id))
        group.visible = false;
      const subdued = this.focusSet
        ? !this.focusSet.has(id)
        : this.traceSet
          ? !this.traceSet.has(id) && id !== 'browser'
          : false;
      group.userData.subdued = subdued;
      group.traverse((child) => {
        const m = child.material;
        if (!m || Array.isArray(m)) return;
        if (child.userData.labOpacity === undefined) {
          child.userData.labOpacity = m.opacity;
          child.userData.labDepth = m.depthWrite;
          child.userData.labTransparent = m.transparent;
        }
        const opacity = child.userData.labOpacity * (subdued ? 0.13 : 1);
        const transparent = subdued || child.userData.labTransparent;
        if (m.transparent !== transparent) {
          m.transparent = transparent;
          m.needsUpdate = true;
        }
        m.opacity = opacity;
        m.depthWrite = subdued ? false : child.userData.labDepth;
      });
      group.userData.label.classList.toggle('is-traced', !!this.traceSet?.has(id));
      group.userData.label.style.opacity = subdued ? '.28' : '1';
    };
    proto.updateLearningVisuals = function (dt) {
      if (this.labPlatforms?.[2]) this.labPlatforms[2].visible = this.buildVisible;
      if (this.labPlatforms?.[3]) this.labPlatforms[3].visible = !!this.groups.get('database')?.visible;
      if (this.screenCanvas)
        this.screenCanvas.style.opacity = this.groups.get('browser')?.userData.subdued ? '.13' : '1';
      for (const [index, item] of (this.traceLines || []).entries()) {
        const { line } = item;
        const from = this.traceChain?.[index] || item.from,
          to = this.traceChain?.[index + 1] || item.to;
        line.visible =
          !!this.traceSet &&
          index < (this.traceChain?.length || 6) - 1 &&
          this.groups.get(from).visible &&
          this.groups.get(to).visible;
        if (line.visible) {
          line.geometry.setFromPoints([this.getPoint(from), this.getPoint(to)]);
          line.computeLineDistances();
        }
      }
      for (const panel of this.modelPanels || []) {
        const id = panel.group.userData.id;
        panel.face.visible =
          !panel.group.userData.subdued &&
          (this.focusSet?.has(id) ||
            id === this.active ||
            id === this.selected ||
            this.camera.position.distanceTo(panel.group.position) < 17);
      }
      for (const [kind, slabs] of Object.entries(this.stackSlabs || {})) {
        const frames = this.runtime?.stacks?.[kind] || [];
        slabs.forEach((mesh, i) => {
          const active = i < frames.length;
          mesh.scale.y += ((active ? 1 : 0.02) - mesh.scale.y) * (this.reduced ? 1 : Math.min(1, dt * 9));
          mesh.visible = mesh.scale.y > 0.03;
          mesh.position.y += (-0.72 + i * 0.25 - mesh.position.y) * (this.reduced ? 1 : Math.min(1, dt * 9));
          mesh.material.color.set(i === frames.length - 1 ? this.palette.orange : this.palette.green);
        });
      }
      const transport = this.runtime?.transport;
      const color =
        transport === 'rpc' || transport === 'query'
          ? this.palette.orange
          : transport === 'uidl'
            ? this.palette.blue
            : transport === 'build'
              ? this.palette.purple
              : this.palette.green;
      if (this.routeLine) this.routeLine.material.color.set(color);
      if (this.routeArrow) this.routeArrow.material.color.set(color);
      if (this.packet?.material) this.packet.material.color.set(color);
      if (this.transferLabel)
        this.transferLabel.textContent =
          transport === 'rpc'
            ? 'RPC → server'
            : transport === 'uidl'
              ? 'UIDL → browser'
              : transport === 'query'
                ? 'repository operation'
                : transport === 'build'
                  ? 'build dependency'
                  : 'execution →';
    };
  }
  const plate = detail.createPlate;
  const partKeys = {
    component: ['view', 'button', 'label'],
    dom: ['span'],
    'server-tree': ['root', 'button-node', 'label-node'],
    'client-tree': ['root', 'button-node', 'label-node'],
    features: ['text-node'],
    database: ['profile', 'orders'],
    threads: ['request', 'worker']
  };
  detail.createPlate = function (group, ...args) {
    const panel = plate.call(this, group, ...args);
    const index = group.userData.panelIndex || 0;
    group.userData.panelIndex = index + 1;
    const part = partKeys[group.userData.id]?.[index];
    if (part) {
      panel.face.userData.part = part;
      panel.backing.userData.part = part;
    }
    return panel;
  };
})();
