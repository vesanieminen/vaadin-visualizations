/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
/* Deterministic teaching model. It deliberately does not emulate a JVM or the complete Flow wire protocol. */
(function (root) {
  'use strict';
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const step = (node, title, body, action, group = 2, transport = 'execution') => ({
    node,
    title,
    body,
    action,
    group,
    transport
  });
  const begin = step(
    'browser',
    'An interaction begins',
    'The browser identifies the target UI. Each tab has its own UI state.',
    'begin',
    0
  );
  const dom = step(
    'dom',
    'The DOM listener runs',
    'The registered listener describes the event using the server-assigned node ID.',
    'event',
    0
  );
  const queue = step(
    'queue',
    'Queue an RPC invocation',
    'The event enters the outgoing queue. The Java object remains on the server.',
    'rpc',
    1,
    'rpc'
  );
  const outbound = step(
    'network',
    'The request travels to Java',
    'The RPC message is in flight. Change network latency to hold this boundary longer.',
    'send',
    1,
    'rpc'
  );
  const lock = step(
    'session',
    'Acquire the shared session lock',
    'Work for this session must acquire its lock before changing UI state. A second tab shares this lock.',
    'lock'
  );
  const dirty = step(
    'features',
    'Record the changed UI state',
    'Element delegates to StateNode features. A changed text value is marked for synchronization.',
    'dirty'
  );
  const encode = step(
    'writer',
    'Encode the state changes',
    'UidlWriter collects changes. Inspect the illustrative UIDL message and its target node.',
    'encode',
    2,
    'uidl'
  );
  const response = step(
    'network',
    'Return the response',
    'The Java request frames return and the lock is released. The response is still in flight.',
    'response',
    3,
    'uidl'
  );
  const apply = step(
    'client-tree',
    'Update the client state',
    'The Flow client applies the message to its state representation, then bindings update the DOM.',
    'apply',
    3,
    'uidl'
  );
  const done = step(
    'browser',
    'Render the synchronized application',
    'The browser now reflects the delivered result. Heap objects remain available for the next interaction.',
    'done',
    3
  );
  const common = [begin, dom, queue, outbound, lock];
  const tail = [dirty, encode, response, apply, done];
  const plans = {
    click: {
      title: 'Click +1',
      steps: [
        ...common,
        step(
          'component',
          'Run the Java click listener',
          'The request thread enters the listener. CounterView.counter changes; the browser still has the previous value.',
          'increment'
        ),
        ...tail
      ]
    },
    navigation: {
      title: 'Navigate to a view',
      steps: [
        ...common,
        step(
          'service',
          'Resolve the route',
          'The application router resolves the destination and builds the view for this UI.',
          'navigate'
        ),
        ...tail
      ]
    },
    startup: {
      title: 'Reconnect the application',
      steps: [
        begin,
        outbound,
        lock,
        step(
          'ui',
          'Recover this simulated UI',
          'This reconnect experiment keeps the existing UI and resynchronizes its browser representation.',
          'reconnect'
        ),
        ...tail
      ]
    },
    binding: {
      title: 'Validate a profile',
      steps: [
        ...common,
        step(
          'binder',
          'Convert and validate the field',
          'Buffered Binder validates the entered name. An empty name produces a validation error.',
          'validate'
        ),
        step(
          'bean',
          'Write only a valid value',
          'A successful writeBeanIfValid updates the application bean. Database persistence is a separate application action.',
          'writeBean'
        ),
        ...tail
      ]
    },
    push: {
      title: 'Background update',
      steps: [
        step(
          'threads',
          'Compute a background result',
          'A worker prepares a result and keeps a reference to the target UI.',
          'worker',
          0
        ),
        step(
          'access',
          'Submit UI.access work',
          'The access task waits for the session lock. No dedicated UI thread is created.',
          'access',
          1
        ),
        lock,
        step(
          'component',
          'Run the access callback',
          'The callback updates this UI under the lock. This experiment assumes automatic push is enabled.',
          'increment'
        ),
        dirty,
        encode,
        step(
          'push',
          'Push the update',
          'The request-independent update travels over the configured push connection.',
          'response',
          3,
          'uidl'
        ),
        apply,
        done
      ]
    },
    data: {
      title: 'Load orders',
      steps: [
        ...common,
        step(
          'provider',
          'Fetch a range of records',
          'DataProvider invokes application code to fetch rows. The database belongs to the application.',
          'fetch'
        ),
        step(
          'database',
          'Read stored orders',
          'The example repository returns a copy of the stored records. Reading does not change them.',
          'query',
          2,
          'query'
        ),
        ...tail
      ]
    },
    persist: {
      title: 'Persist the profile',
      steps: [
        ...common,
        step(
          'database',
          'Save the application bean',
          'Application repository code explicitly persists the accepted bean value. Binder does not save to the database.',
          'persist',
          2,
          'query'
        ),
        ...tail
      ]
    },
    persistOrders: {
      title: 'Save an order',
      steps: [
        ...common,
        step(
          'binder',
          'Validate the edited order',
          'The example application checks that the total is a finite, non-negative amount.',
          'validateOrder'
        ),
        step(
          'database',
          'Persist the order change',
          'The application repository writes the accepted total to the stored order.',
          'persistOrders',
          2,
          'query'
        ),
        ...tail
      ]
    },
    build: {
      title: 'Build the frontend',
      steps: [
        step(
          'scanner',
          'Discover dependencies',
          'Build tooling reads frontend dependency metadata from Java classes.',
          'build',
          0,
          'build'
        ),
        step(
          'build',
          'Generate imports',
          'The build produces the frontend entry points from discovered dependencies.',
          'build',
          1,
          'build'
        ),
        step(
          'build',
          'Bundle JavaScript and CSS',
          'The frontend build creates deployable assets before the application runs.',
          'build',
          2,
          'build'
        ),
        step(
          'bundle',
          'Assets are ready to serve',
          'The browser downloads code and styles. Runtime UI state travels separately.',
          'build',
          3,
          'build'
        )
      ]
    }
  };
  function createTab(id) {
    return {
      id,
      server: 7,
      serverText: 7,
      clientState: 7,
      client: 7,
      route: '/counter',
      clientRoute: '/counter',
      draft: 'Grace',
      bean: 'Grace',
      validation: null,
      serverValidation: null,
      orders: [],
      serverOrders: [],
      orderTotal: 120,
      dirty: false,
      generation: 1
    };
  }
  function createState() {
    return {
      tabs: [createTab(1)],
      selectedTab: 1,
      database: {
        profile: 'Grace',
        orders: [
          { id: 1001, customer: 'Ada', total: 120 },
          { id: 1002, customer: 'Grace', total: 85 },
          { id: 1003, customer: 'Linus', total: 210 }
        ]
      },
      lock: { external: false, owner: null },
      pending: [],
      active: null,
      stacks: { request: [], worker: [] },
      messages: [],
      latency: 600,
      nextId: 1,
      phase: {
        node: 'browser',
        title: 'Try the application',
        body: 'Click +1 to start. Pause anywhere, inspect the state, or open the detailed lab at the same point.',
        group: 0,
        transport: 'execution',
        changes: [],
        waiting: false
      }
    };
  }
  class RuntimeModel {
    constructor() {
      this.commands = [];
      this.history = [{ state: createState(), commandCount: 0 }];
      this.cursor = 0;
    }
    get state() {
      return this.history[this.cursor].state;
    }
    get plan() {
      return plans[this.state.active?.kind || 'click'];
    }
    seek(index) {
      this.cursor = Math.max(0, Math.min(this.history.length - 1, Math.trunc(index) || 0));
    }
    canAdvance() {
      if (this.cursor < this.history.length - 1) return true;
      const s = this.state;
      if (s.phase.waiting && s.lock.external) return false;
      return !!(s.pending.length || (s.active && !s.active.complete && !s.phase.waiting));
    }
    record(command, mutate) {
      const current = this.history[this.cursor];
      this.commands.length = current.commandCount;
      this.history.length = this.cursor + 1;
      const state = copy(current.state);
      mutate(state);
      this.commands.push(copy(command));
      this.history.push({ state, commandCount: this.commands.length });
      this.cursor++;
      return true;
    }
    configure(name, value) {
      if (!['hold', 'latency', 'second', 'tab'].includes(name)) throw Error('Unknown setting');
      return this.record(['configure', name, value], (s) => {
        if (name === 'hold') {
          s.lock.external = !!value;
          if (!value) s.phase.waiting = false;
        }
        if (name === 'latency') s.latency = Math.max(0, Math.min(4000, Number(value) || 0));
        if (name === 'second' && value && s.tabs.length === 1) s.tabs.push(createTab(2));
        if (name === 'tab') s.selectedTab = s.tabs.some((t) => t.id === Number(value)) ? Number(value) : 1;
      });
    }
    edit(field, value) {
      if (!['draft', 'orderTotal'].includes(field)) throw Error('Unknown application field');
      return this.record(['edit', field, value], (s) => {
        const tab = s.tabs.find((t) => t.id === s.selectedTab);
        tab[field] =
          field === 'draft' ? String(value).slice(0, 80) : Number.isFinite(Number(value)) ? Number(value) : -1;
        s.phase = {
          node: 'dom',
          title: 'Edit the browser field',
          body: 'The draft is local to this tab until you submit it. The accepted bean and database still have their previous values.',
          group: 0,
          transport: 'execution',
          changes: [
            {
              label: field,
              before: this.state.tabs.find((t) => t.id === tab.id)[field],
              after: tab[field],
              target: 'dom'
            }
          ]
        };
      });
    }
    dispatch(kind, input = {}) {
      if (!Object.hasOwn(plans, kind)) throw Error('Unknown experiment');
      return this.record(['dispatch', kind, input], (s) => {
        const tab = s.tabs.find((t) => t.id === Number(input.tab || s.selectedTab)) || s.tabs[0];
        const operation = {
          id: s.nextId++,
          kind,
          tab: tab.id,
          input: {
            name: tab.draft,
            total: tab.orderTotal,
            route: ['/counter', '/orders', '/profile'].includes(input.route) ? input.route : '/orders'
          },
          index: 0,
          complete: false
        };
        if (s.active && !s.active.complete) {
          s.pending.push(operation);
          s.phase = {
            ...s.phase,
            title: `UI #${tab.id} queued ${plans[kind].title}`,
            body: 'The current operation keeps its place. Queued interactions run in order and acquire the same session lock.'
          };
        } else this.start(s, operation);
      });
    }
    start(s, operation) {
      s.active = operation;
      this.applyStep(s);
    }
    advance() {
      if (this.cursor < this.history.length - 1) {
        this.cursor++;
        return true;
      }
      const current = this.state;
      if (current.phase.waiting && current.lock.external) return false;
      if ((!current.active || current.active.complete) && !current.pending.length) return false;
      return this.record(['advance'], (s) => {
        if (!s.active || s.active.complete) this.start(s, s.pending.shift());
        else {
          const next = plans[s.active.kind].steps[s.active.index + 1];
          if (next.action === 'lock' && s.lock.external) {
            s.phase = {
              ...next,
              waiting: true,
              title: 'Waiting for the session lock',
              body: 'Another operation owns the lock. Release Hold session lock to let this work enter Java.',
              changes: []
            };
            return;
          }
          s.active.index++;
          this.applyStep(s);
        }
      });
    }
    applyStep(s) {
      const op = s.active,
        tab = s.tabs.find((t) => t.id === op.tab),
        plan = plans[op.kind];
      const item = plan.steps[op.index];
      const previous = copy(s);
      const reference = `UI@${tab.id}`,
        view = `view@${tab.id}.${tab.generation}`;
      const frame = (method, locals = {}) => ({ method, locals });
      const request = () => [
        frame('VaadinService.handleRequest', { ui: reference }),
        frame('ServerRpcHandler.handleRpc', { ui: reference })
      ];
      s.phase = { ...item, changes: [], waiting: false, operation: op.id, tab: tab.id };
      const message = (type, payload) => {
        const entry = {
          id: `${type.toLowerCase()}-${op.id}`,
          operation: op.id,
          kind: op.kind,
          tab: tab.id,
          type,
          status: 'queued',
          payload
        };
        s.messages.push(entry);
        if (s.messages.length > 30) s.messages.shift();
        return entry;
      };
      const lastMessage = (type) => s.messages.find((m) => m.operation === op.id && m.type === type);
      switch (item.action) {
        case 'rpc':
          message('RPC', {
            ui: tab.id,
            rpc: [
              {
                type: 'event',
                node: 7,
                event: op.kind === 'click' ? 'click' : op.kind,
                data: op.kind === 'binding' ? { value: op.input.name } : {}
              }
            ]
          });
          break;
        case 'send':
          if (lastMessage('RPC')) lastMessage('RPC').status = 'in flight';
          break;
        case 'lock':
          s.lock.owner = `${op.kind === 'push' ? 'access' : 'request'}-${op.id}`;
          if (op.kind === 'push') {
            s.stacks.worker = [frame('UI.access callback', { ui: reference })];
            s.stacks.request = [];
          } else s.stacks.request = request();
          if (lastMessage('RPC')) lastMessage('RPC').status = 'received';
          break;
        case 'increment':
          (op.kind === 'push' ? s.stacks.worker : s.stacks.request).push(
            frame(op.kind === 'push' ? 'UI.access callback: update' : 'ClickListener.onComponentEvent', {
              this: view,
              label: `Span@${tab.id}.8`,
              next: tab.server + 1
            })
          );
          tab.server++;
          break;
        case 'navigate':
          s.stacks.request.push(frame('Router.navigate', { ui: reference, path: op.input.route }));
          tab.route = op.input.route;
          tab.serverValidation = null;
          tab.generation++;
          break;
        case 'reconnect':
          s.stacks.request.push(frame('UIInternals.getStateTree', { ui: reference }));
          break;
        case 'validate':
          s.stacks.request.push(
            frame('Binder.writeBeanIfValid', {
              binder: `Binder@${tab.id}`,
              bean: `Person@${tab.id}`,
              value: op.input.name
            })
          );
          tab.serverValidation = op.input.name.trim() ? null : 'Name is required';
          tab.route = '/profile';
          break;
        case 'writeBean':
          if (!tab.serverValidation) tab.bean = op.input.name.trim();
          else {
            s.phase.title = 'Validation stopped the bean write';
            s.phase.body =
              'The empty name is rejected. The bean and database stay unchanged; the browser will receive a validation error.';
          }
          break;
        case 'fetch':
          s.stacks.request.push(frame('DataProvider.fetch', { offset: 0, limit: 50 }));
          break;
        case 'query':
          tab.serverValidation = null;
          tab.serverOrders = copy(s.database.orders);
          tab.route = '/orders';
          message('QUERY', { operation: 'SELECT', entity: 'orders', rows: copy(tab.serverOrders) }).status =
            'completed';
          break;
        case 'persist':
          s.stacks.request.push(frame('PersonRepository.save', { bean: `Person@${tab.id}` }));
          s.database.profile = tab.bean;
          message('QUERY', { operation: 'UPDATE', entity: 'profile', name: tab.bean }).status = 'completed';
          break;
        case 'validateOrder':
          tab.serverValidation =
            Number.isFinite(op.input.total) && op.input.total >= 0 ? null : 'Total must be zero or greater';
          break;
        case 'persistOrders':
          if (!tab.serverValidation) {
            s.database.orders[0].total = op.input.total;
            tab.serverOrders = copy(s.database.orders);
            message('QUERY', { operation: 'UPDATE', entity: 'orders', id: 1001, total: op.input.total }).status =
              'completed';
          } else {
            s.phase.title = 'The invalid order was not saved';
            s.phase.body = 'Validation rejected the total. Stored rows remain unchanged.';
          }
          break;
        case 'worker':
          s.stacks.worker = [frame('BackgroundTask.run', { ui: reference, result: tab.server + 1 })];
          break;
        case 'access':
          s.stacks.worker = [frame('UI.access', { ui: reference, task: `task@${op.id}` })];
          break;
        case 'dirty':
          tab.serverText = tab.server;
          tab.dirty = true;
          (op.kind === 'push' ? s.stacks.worker : s.stacks.request).push(
            frame('StateNode.markAsDirty', { node: `TextNode@${tab.id}.9`, value: String(tab.serverText) })
          );
          break;
        case 'encode':
          if (op.kind === 'push') s.stacks.worker = [frame('UidlWriter.createUidl', { ui: reference })];
          else s.stacks.request = [request()[0], frame('UidlWriter.createUidl', { ui: reference })];
          message('UIDL', {
            ui: tab.id,
            changes:
              op.kind === 'click' || op.kind === 'push'
                ? [{ node: 9, feature: 'TextNodeMap', key: 'text', value: String(tab.serverText) }]
                : [{ route: tab.route, name: tab.bean, validation: tab.serverValidation, rows: copy(tab.serverOrders) }]
          });
          op.delivery = {
            text: tab.serverText,
            route: tab.route,
            name: tab.bean,
            validation: tab.serverValidation,
            rows: copy(tab.serverOrders)
          };
          tab.dirty = false;
          break;
        case 'response':
          if (lastMessage('UIDL')) lastMessage('UIDL').status = 'in flight';
          s.lock.owner = null;
          s.stacks.request = [];
          s.stacks.worker = [];
          break;
        case 'apply':
          tab.clientState = op.delivery.text;
          if (lastMessage('UIDL')) lastMessage('UIDL').status = 'received';
          break;
        case 'done':
          tab.client = tab.clientState;
          tab.clientRoute = op.delivery.route;
          tab.validation = op.delivery.validation;
          tab.orders = copy(op.delivery.rows);
          if (lastMessage('UIDL')) lastMessage('UIDL').status = 'applied';
          if (tab.validation) {
            s.phase.title = 'The browser displays the validation error';
            s.phase.body = tab.validation + '. Edit the field and submit again.';
          }
          break;
      }
      const beforeTab = previous.tabs.find((t) => t.id === tab.id);
      const fields = {
        server: ['CounterView.counter', 'component'],
        serverText: ['TextNode #9.text', 'features'],
        clientState: ['Client node #9.text', 'client-tree'],
        client: ['DOM span.textContent', 'dom'],
        bean: ['Person.name', 'bean'],
        dirty: ['StateNode.dirty', 'features'],
        route: ['UI route', 'service'],
        clientRoute: ['Browser route', 'browser'],
        serverValidation: ['Validation result', 'binder'],
        orders: ['Grid rows', 'provider']
      };
      for (const [key, [label, target]] of Object.entries(fields))
        if (JSON.stringify(beforeTab[key]) !== JSON.stringify(tab[key]))
          s.phase.changes.push({ label, before: beforeTab[key], after: tab[key], target });
      if (JSON.stringify(previous.database) !== JSON.stringify(s.database))
        s.phase.changes.push({
          label: 'Stored application data',
          before: previous.database,
          after: copy(s.database),
          target: 'database'
        });
      if (JSON.stringify(previous.stacks) !== JSON.stringify(s.stacks))
        s.phase.changes.push({
          label: 'Thread frames',
          before: Object.values(previous.stacks)
            .flat()
            .map((f) => f.method),
          after: Object.values(s.stacks)
            .flat()
            .map((f) => f.method),
          target: 'threads'
        });
      if (op.index === plan.steps.length - 1) op.complete = true;
    }
    serialize() {
      return { version: 1, commands: copy(this.commands), cursor: this.cursor };
    }
    static restore(data) {
      if (!data || data.version !== 1 || !Array.isArray(data.commands) || data.commands.length > 2500)
        throw Error('Invalid simulation link');
      const model = new RuntimeModel();
      for (const cmd of data.commands) {
        if (!Array.isArray(cmd) || !['configure', 'edit', 'dispatch', 'advance'].includes(cmd[0]))
          throw Error('Invalid simulation action');
        model[cmd[0]](...cmd.slice(1));
      }
      model.seek(data.cursor ?? model.history.length - 1);
      return model;
    }
  }
  const api = { RuntimeModel, plans };
  if (typeof module !== 'undefined') module.exports = api;
  else root.FLOW_RUNTIME_MODEL = api;
})(typeof window === 'undefined' ? globalThis : window);
