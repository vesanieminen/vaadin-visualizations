/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  'use strict';
  // Logical identities and references for the teaching application, not JVM addresses.
  function inspect(state, tabId = state.selectedTab) {
    const tab = state.tabs.find((t) => t.id === tabId) || state.tabs[0];
    const objects = window.FLOW_WORLD_DETAILS_CONTENT.objects;
    const graph = {};
    const value = (name, value) => ({ name, value });
    const ref = (name, ref) => ({ name, ref });
    function add(key, title, identity, fields = [], children = [], parent = null) {
      const scene = key.split('/')[0];
      graph[key] = { key, scene, title, identity, fields, children, parent, source: objects[scene]?.source };
    }
    for (const [id, item] of Object.entries(objects)) add(id, item.title, item.zone, [], [], null);
    add(
      'heap',
      'Java heap',
      'Logical object ownership',
      [value('Lifetime', 'Objects remain after request frames return')],
      ['session', 'bean']
    );
    add(
      'session',
      'VaadinSession',
      'session@1',
      [
        value('lock owner', state.lock.external ? 'external operation' : state.lock.owner || 'available'),
        ...state.tabs.map((t) => ({ ...ref(`UI #${t.id}`, 'ui'), identity: `UI@${t.id}`, tab: t.id }))
      ],
      ['ui', ...(state.tabs.length > 1 ? ['second-ui'] : [])],
      'heap'
    );
    add(
      'ui',
      `UI #${tab.id} / UIInternals`,
      `UI@${tab.id}`,
      [ref('view', 'component/view'), ref('internals.stateTree', 'server-tree'), value('route', tab.route)],
      ['component', 'server-tree'],
      'session'
    );
    add(
      'component',
      'Application component graph',
      `View owned by UI@${tab.id}`,
      [ref('view', 'component/view')],
      ['component/view', 'component/button', 'component/label'],
      'ui'
    );
    const viewName = tab.route === '/profile' ? 'ProfileView' : tab.route === '/orders' ? 'OrdersView' : 'CounterView';
    add(
      'component/view',
      viewName,
      `view@${tab.id}.${tab.generation}`,
      tab.route === '/counter'
        ? [value('counter', tab.server), ref('button', 'component/button'), ref('label', 'component/label')]
        : tab.route === '/profile'
          ? [ref('binder', 'binder'), ref('person', 'bean'), value('name field', tab.draft)]
          : [ref('dataProvider', 'provider'), value('loaded rows', tab.serverOrders.length)],
      ['component/button', 'component/label'],
      'component'
    );
    add(
      'component/button',
      'Button / listener',
      `Button@${tab.id}.7`,
      [value('event', 'click'), ref('listener captures view', 'component/view')],
      [],
      'component/view'
    );
    add('component/label', 'Span', `Span@${tab.id}.8`, [ref('element', 'element')], ['element'], 'component/view');
    add(
      'element',
      'Element',
      `Element@${tab.id}.8`,
      [value('tag', 'span'), ref('node', 'server-tree/label-node')],
      ['server-tree/label-node'],
      'component/label'
    );
    add(
      'server-tree',
      'Server StateTree',
      `StateTree@${tab.id}`,
      [ref('root', 'server-tree/root'), value('dirty nodes', tab.dirty ? [9] : [])],
      ['server-tree/root', 'server-tree/button-node', 'server-tree/label-node'],
      'ui'
    );
    add(
      'server-tree/root',
      'Root StateNode',
      `StateNode@${tab.id}.1`,
      [ref('button', 'server-tree/button-node'), ref('label', 'server-tree/label-node')],
      ['server-tree/button-node', 'server-tree/label-node'],
      'server-tree'
    );
    add(
      'server-tree/button-node',
      'Button StateNode',
      `StateNode@${tab.id}.7`,
      [value('ElementData.tag', 'vaadin-button'), value('DOM event listener', 'click')],
      [],
      'server-tree/root'
    );
    add(
      'server-tree/label-node',
      'Span StateNode',
      `StateNode@${tab.id}.8`,
      [value('ElementData.tag', 'span'), ref('ElementChildrenList[0]', 'features/text-node')],
      ['features/text-node'],
      'element'
    );
    add(
      'features',
      'StateNode features',
      `Features of UI@${tab.id}`,
      [ref('text child', 'features/text-node')],
      ['features/text-node'],
      'server-tree'
    );
    add(
      'features/text-node',
      'Text node / TextNodeMap',
      `TextNode@${tab.id}.9`,
      [
        value('text', String(tab.serverText)),
        value('dirty', tab.dirty),
        ref('corresponding client node', 'client-tree/text-node')
      ],
      [],
      'server-tree/label-node'
    );
    add(
      'browser',
      `Browser tab #${tab.id}`,
      'Browser process',
      [value('route', tab.clientRoute), ref('rendered page', 'dom'), ref('Flow state', 'client-tree')],
      ['dom', 'client-tree', 'client-engine', 'queue']
    );
    add(
      'dom',
      'Rendered DOM',
      `document@${tab.id}`,
      [ref('span', 'dom/span'), value('visible route', tab.clientRoute)],
      ['dom/button', 'dom/span'],
      'browser'
    );
    add(
      'dom/span',
      '<span> text',
      `DOM@${tab.id}.span`,
      [value('textContent', String(tab.client)), ref('binding reads', 'client-tree/text-node')],
      [],
      'dom'
    );
    add(
      'dom/button',
      '<vaadin-button>',
      `DOM@${tab.id}.button`,
      [value('listener', 'click'), ref('enqueues invocation', 'queue')],
      [],
      'dom'
    );
    add(
      'client-tree',
      'Client StateTree',
      `ClientStateTree@${tab.id}`,
      [ref('text state', 'client-tree/text-node')],
      ['client-tree/root', 'client-tree/button-node', 'client-tree/label-node', 'client-tree/text-node'],
      'browser'
    );
    add(
      'client-tree/root',
      'Client root',
      `client@${tab.id}.1`,
      [ref('label', 'client-tree/label-node')],
      [],
      'client-tree'
    );
    add(
      'client-tree/button-node',
      'Client button state',
      `client@${tab.id}.7`,
      [ref('bound element', 'dom/button')],
      [],
      'client-tree'
    );
    add(
      'client-tree/label-node',
      'Client span state',
      `client@${tab.id}.8`,
      [ref('text child', 'client-tree/text-node')],
      ['client-tree/text-node'],
      'client-tree'
    );
    add(
      'client-tree/text-node',
      'Client text state',
      `client@${tab.id}.9`,
      [value('text', String(tab.clientState)), ref('updates', 'dom/span')],
      [],
      'client-tree'
    );
    add(
      'threads',
      'Thread stacks',
      'Execution / temporary frames',
      [value('request frames', state.stacks.request.length), value('worker frames', state.stacks.worker.length)],
      ['threads/request', 'threads/worker']
    );
    const findRef = (id) =>
      id?.startsWith('UI@')
        ? 'ui'
        : id?.startsWith('view@')
          ? 'component/view'
          : id?.startsWith('Span@')
            ? 'component/label'
            : id?.startsWith('TextNode@')
              ? 'features/text-node'
              : id?.startsWith('Person@')
                ? 'bean'
                : null;
    for (const kind of ['request', 'worker']) {
      const frames = state.stacks[kind];
      add(
        `threads/${kind}`,
        `${kind === 'request' ? 'Request' : 'Worker / access'} stack`,
        state.active ? `${kind}-${state.active.id}` : 'idle',
        [value('status', frames.length ? 'executing' : 'frames returned')],
        frames.map((_, i) => `threads/${kind}-${i}`).reverse(),
        'threads'
      );
      frames.forEach((frame, i) =>
        add(
          `threads/${kind}-${i}`,
          frame.method,
          `frame ${i + 1}${i === frames.length - 1 ? ' · top' : ''}`,
          Object.entries(frame.locals).map(([key, val]) =>
            findRef(String(val))
              ? { ...ref(key, findRef(String(val))), identity: val, tab: Number(String(val).match(/@(\d+)/)?.[1]) }
              : value(key, val)
          ),
          [],
          `threads/${kind}`
        )
      );
    }
    add(
      'binder',
      'Buffered Binder<Person>',
      `Binder@${tab.id}`,
      [
        value('field draft', tab.draft),
        value('validation', tab.serverValidation || 'valid / not rejected'),
        ref('accepted bean', 'bean')
      ],
      ['bean'],
      'component'
    );
    add(
      'bean',
      'Person',
      `Person@${tab.id}`,
      [
        value('name', tab.bean),
        value('stored name', state.database.profile),
        value('save policy', 'application calls repository explicitly')
      ],
      [],
      'heap'
    );
    add(
      'database',
      'Application persistence',
      'Application repository / database',
      [ref('stored profile', 'database/profile'), ref('orders', 'database/orders')],
      ['database/profile', 'database/orders']
    );
    add(
      'database/profile',
      'Stored profile',
      'profile row #1',
      [value('name', state.database.profile)],
      [],
      'database'
    );
    add(
      'database/orders',
      'Stored orders',
      'orders table',
      [value('row count', state.database.orders.length)],
      state.database.orders.map((o) => `database/order-${o.id}`),
      'database'
    );
    state.database.orders.forEach((o) =>
      add(
        `database/order-${o.id}`,
        `Order #${o.id}`,
        `orders[${o.id}]`,
        Object.entries(o).map(([k, v]) => value(k, v)),
        [],
        'database/orders'
      )
    );
    add(
      'provider',
      'DataProvider / DataCommunicator',
      `provider@${tab.id}`,
      [
        value('offset', 0),
        value('limit', 50),
        value('server rows', tab.serverOrders),
        value('browser rows', tab.orders),
        ref('repository reads', 'database/orders')
      ],
      [],
      'component'
    );
    add('network', 'Protocol boundary', 'Browser ↔ server', [
      value('one-way latency', `${state.latency} ms`),
      value(
        'in-flight messages',
        state.messages.filter((m) => m.status === 'in flight').map((m) => m.id)
      )
    ]);
    for (const id of ['queue', 'access'])
      add(
        id,
        objects[id].title,
        'Ordered work',
        [
          value(
            'queued operations',
            state.pending
              .filter((p) => (id === 'access' ? p.kind === 'push' : p.kind !== 'push'))
              .map((p) => `#${p.id} · UI ${p.tab} · ${p.kind}`)
          ),
          ref('shared lock', 'session')
        ],
        [],
        id === 'queue' ? 'browser' : 'threads'
      );
    add('servlet', 'Request dispatch', 'VaadinServlet / VaadinService', [
      ref('resolve UI', 'ui'),
      ref('acquire lock', 'session'),
      ref('executing frames', 'threads/request')
    ]);
    add('service', 'Router / application services', 'Route resolution', [
      value('route', tab.route),
      ref('current view', 'component/view')
    ]);
    add('writer', 'UidlWriter', 'Synchronization', [
      ref('reads dirty nodes', 'server-tree'),
      value(
        'latest message',
        state.messages.filter((m) => m.type === 'UIDL').at(-1)?.payload || 'No response encoded yet'
      )
    ]);
    add(
      'client-engine',
      'Flow client engine',
      'Message handler + DOM binding',
      [ref('updates state', 'client-tree'), ref('binds DOM', 'dom')],
      [],
      'browser'
    );
    add('push', 'Push connection', 'Automatic push configured in this example', [
      ref('access task', 'access'),
      ref('encoded response', 'writer'),
      value('last delivery', state.messages.filter((m) => m.type === 'UIDL').at(-1)?.status || 'idle')
    ]);
    add(
      'second-ui',
      'UI #2',
      'UI@2 · same session',
      [
        value('Java counter', state.tabs[1]?.server ?? 'Open a second tab'),
        value('browser counter', state.tabs[1]?.client ?? 'Open a second tab'),
        ref('shared session', 'session')
      ],
      [],
      'session'
    );
    add('scanner', 'Dependency discovery', 'Build time', [
      value('inputs', ['@JsModule', '@CssImport', '@NpmPackage']),
      ref('next', 'build')
    ]);
    add('build', 'Frontend build', 'Build time', [
      value('steps', ['generate imports', 'bundle JavaScript + CSS']),
      ref('output', 'bundle')
    ]);
    add('bundle', 'Browser assets', 'Build output', [
      value('contents', ['JavaScript modules', 'web components', 'CSS']),
      ref('loaded by', 'browser')
    ]);
    const sources = {
      VaadinService: 'service',
      ServerRpcHandler: 'rpc',
      ClickListener: 'event',
      'UI.access': 'ui',
      StateNode: 'node',
      UidlWriter: 'writer',
      Binder: 'binder',
      DataProvider: 'provider',
      Router: 'router'
    };
    for (const item of Object.values(graph)) {
      if (item.key.startsWith('threads/')) {
        const match = Object.entries(sources).find(([method]) => item.title.startsWith(method));
        if (match) item.source = match[1];
      }
    }
    const viewChildren =
      tab.route === '/profile'
        ? ['binder', 'bean']
        : tab.route === '/orders'
          ? ['provider']
          : ['component/button', 'component/label'];
    graph.component.children = ['component/view', ...viewChildren];
    graph['component/view'].children = viewChildren;
    return graph;
  }
  window.FLOW_RUNTIME_INSPECTION = { inspect };
})();
