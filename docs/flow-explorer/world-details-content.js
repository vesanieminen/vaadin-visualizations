/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  const object = (title, zone, subtitle, body, contains, source, inside) => ({
    title,
    zone,
    subtitle,
    body,
    contains,
    source,
    inside
  });
  const objects = {
    browser: object(
      'The browser application',
      'browser',
      'What the person actually sees',
      'Use the miniature application: increment its counter, open Orders and load records, edit a profile, reconnect, or trigger a background update. Each control starts a source-backed journey. The screen reflects server results only when the simulated response comes back.',
      ['HTML and web components', 'Application JavaScript and CSS', 'The Flow client runtime'],
      'binding',
      'click/dom'
    ),
    dom: object(
      'The actual DOM',
      'browser',
      'HTML elements in browser memory',
      'The visible page is a hierarchy of real DOM nodes. Flow bindings associate these with client StateNodes. Browser layout and painting happen here; Java Component objects remain on the server.',
      ['Root element → button + text', 'DOM properties and event listeners', 'Web component internals / shadow DOM'],
      'binding',
      'click/dom'
    ),
    'client-tree': object(
      'The client state tree',
      'browser',
      'A synchronized representation of UI state',
      'Client StateNodes store protocol feature maps and lists. Their numeric IDs correspond to server nodes within this UI. Bindings translate changes in this tree into DOM operations.',
      ['Node identity map', 'Feature maps and lists', 'Reactive computations and DOM bindings'],
      'clientTree',
      'click/client'
    ),
    'client-engine': object(
      'The Flow browser engine',
      'browser',
      'Receive → decode → update → flush',
      'MessageHandler imports constants and processes updates. TreeChangeProcessor attaches new nodes before applying other changes. Reactive work then updates DOM bindings. This runs as browser JavaScript, not as a JVM in the tab.',
      ['MessageHandler', 'TreeChangeProcessor', 'Constant pool and client Registry'],
      'message',
      'click/client'
    ),
    queue: object(
      'The outgoing RPC queue',
      'browser',
      'Batch interactions before sending',
      'ServerConnector describes configured interactions. ServerRpcQueue holds pending invocations and schedules a deferred flush. MessageSender coordinates transport, UI lifecycle and request ordering.',
      ['Node ID + event name + event data', 'Property synchronization invocations', 'Deferred flush and request state'],
      'queue',
      'click/client'
    ),
    network: object(
      'The protocol boundary',
      'network',
      'Messages cross. Java objects stay.',
      'Requests and responses carry JSON protocol data: interaction invocations, changes, constants and instructions. The animated packets are illustrative, not captured traffic. Push can deliver an update without waiting for another user event.',
      [
        'Browser → server: RPC invocations',
        'Server → browser: UIDL updates',
        'HTTP requests / configured push transport'
      ],
      'protocol',
      'click/request'
    ),
    servlet: object(
      'Request & RPC handling',
      'server',
      'Enter the right session and UI',
      'VaadinServlet and VaadinService establish request context. UIDL handling finds the target UI and dispatches invocations under the session lock. Property synchronization is processed before ordinary event invocations.',
      ['VaadinServlet / VaadinService', 'UidlRequestHandler / ServerRpcHandler', 'MapSyncRpcHandler / EventRpcHandler'],
      'rpc',
      'click/request'
    ),
    service: object(
      'Application services & routing',
      'server',
      'Shared infrastructure for UI instances',
      'VaadinService provides application-level infrastructure. Router resolves destinations and the navigation renderer coordinates lifecycle observers and layout chains. Instantiator supplies components, optionally through Spring, CDI or Quarkus.',
      ['Service and route registry', 'Router and navigation handlers', 'Instantiator / dependency injection'],
      'router',
      'navigation/request'
    ),
    heap: object(
      'The Java heap',
      'server',
      'A logical object graph, not a heap dump',
      'Sessions, UIs, components and state nodes are ordinary Java objects. These nested frames show ownership and references conceptually. They are not actual JVM regions, object addresses, allocation sizes or a garbage-collector visualization.',
      [
        'Session-scoped and UI-scoped objects',
        'Application beans and component instances',
        'References connecting the runtime graph'
      ],
      'internals',
      'click/app'
    ),
    session: object(
      'VaadinSession',
      'server',
      'A shared lock around its UI state',
      'A session can own several UIs. Requests and UI.access tasks coordinate through its reentrant lock. Enable a second tab to see two distinct UI trees sharing the same session and lock; unrelated sessions are separate.',
      ['UI registry', 'Reentrant session lock', 'Pending access queue and session state'],
      'session',
      'push/app'
    ),
    ui: object(
      'UI #1 & UIInternals',
      'server',
      'The server-side root for this browser UI',
      'UI is the server-side root for this particular UI instance. UIInternals contains its StateTree and synchronization/lifecycle data. A second browser tab normally initializes a distinct UI, even if it shares the session.',
      ['One StateTree for this UI', 'Current route/layout chain', 'Pending JavaScript and synchronization IDs'],
      'internals',
      'click/state'
    ),
    'second-ui': object(
      'UI #2 — another browser tab',
      'server',
      'A separate tree under the same session lock',
      'This optional miniature represents another UI in the same session. Its components and state tree are independent. The example counter update belongs to UI #1; the second UI does not inherit those changes automatically.',
      [
        'Independent component instances',
        'Independent StateTree and node IDs',
        'Shared session lock, separate UI state'
      ],
      'ui',
      'push/request'
    ),
    component: object(
      'Your view & Java listener',
      'server',
      'Application behavior executes here',
      'The example listener increments a Java counter and changes a label. Component exposes its root Element. Routing creates these view instances through Instantiator; application services and persistence remain application choices.',
      ['CounterView instance', 'Button click listener', 'Label / Span component'],
      'component',
      'click/app'
    ),
    element: object(
      'Element',
      'server',
      'A Java API over a StateNode',
      'Element exposes DOM-like operations on the server. setText changes the server-side element representation, including text children. It does not directly reach into the browser; the state changes must be serialized and delivered.',
      ['Element state provider', 'Properties, attributes, children', 'Underlying StateNode reference'],
      'element',
      'click/app'
    ),
    'server-tree': object(
      'The server state tree',
      'server',
      'Identity + accumulated changes',
      'UIInternals owns a StateTree. StateNode features store element state, and mutations dirty the affected nodes. UidlWriter collects their NodeChanges. Expand the world to expose this tree beside the component hierarchy.',
      ['Root node and ID → node map', 'Dirty-node set', 'Before-client-response callbacks'],
      'state',
      'click/state'
    ),
    features: object(
      'StateNode features',
      'server',
      'The pieces inside each node',
      'Features separate properties, children, listeners and other aspects of a node. They record changes in protocol-specific structures. The small satellites in this model stand for those different feature types, not Java object byte sizes.',
      ['ElementPropertyMap', 'ElementChildrenList', 'ElementListenerMap and other features'],
      'node',
      'click/state'
    ),
    writer: object(
      'UidlWriter',
      'server',
      'Turn Java-side mutations into a response',
      'The writer runs before-response work, collects changes, includes dependencies and pending JavaScript, then dumps new constants. Both ordinary responses and push updates reuse this encoding machinery.',
      ['NodeChanges → JSON', 'Constants, dependencies, JavaScript', 'Synchronization metadata'],
      'writer',
      'click/writer'
    ),
    threads: object(
      'Request & worker threads',
      'server',
      'Execution moves; objects remain in the heap',
      'The thread cards show illustrative execution contexts. A request processes a listener while holding the session lock. Background work enters through UI.access. Flow does not require a permanently dedicated thread for each UI.',
      ['Request handling stack', 'Background application work', 'Current UI/session context during access'],
      'ui',
      'push/request'
    ),
    access: object(
      'UI.access & pending tasks',
      'server',
      'Enter the UI safely from background work',
      'UI.access submits a command through VaadinSession.access. The command runs while the session is locked and the appropriate UI is current. Try holding the lock while playing a journey: work waits at the lock boundary.',
      [
        'Command wrapped for error handling',
        'Future and pending task queue',
        'Attachment checks and current instances'
      ],
      'ui',
      'push/request'
    ),
    push: object(
      'The push connection',
      'server',
      'Deliver without another browser click',
      'With automatic push configured, the outermost session unlock coordinates sending updates. AtmospherePushConnection sends or records pending work according to connection state. It carries UI changes; it does not remove the need for locking.',
      ['Connection / pending state', 'Serialized UIDL payload', 'Configured transport to the client'],
      'push',
      'push/writer'
    ),
    binder: object(
      'Binder & its bindings',
      'server',
      'Fields → conversion → validation → model',
      'A BindingBuilder combines a field, converters, validators and model accessors into a binding. This lab follows buffered readBean/writeBeanIfValid semantics. Property synchronization gets the value to the field first.',
      ['HasValue field and BindingImpl', 'Converter / validator chain', 'Getter, setter and validation status'],
      'binder',
      'binding/app'
    ),
    bean: object(
      'Your application bean',
      'server',
      'Ordinary Java application data',
      'A successful buffered Binder write invokes setters after field validation, then checks bean-level rules. Old bound values can be restored when bean validation fails. This is not a database transaction and cannot undo setter side effects.',
      ['Bound property values', 'Application domain behavior', 'Bean-level validation rules'],
      'binder',
      'binding/state'
    ),
    provider: object(
      'DataProvider / DataCommunicator',
      'server',
      'Fetch a range of items for a component',
      'DataProvider defines fetching and sizing data. DataCommunicator coordinates active data and communicates items to the client. Application code decides whether items come from memory, a service or a database.',
      ['Query offset, limit, sort and filter', 'Provider fetch/count operations', 'Active data and item identity'],
      'data',
      null
    ),
    database: object(
      'Application persistence',
      'application',
      'An external system chosen by your app',
      'The database cylinder is an architectural example. Flow does not automatically store every component or bean in a database. Your services, repositories and transaction boundaries implement persistence; this diagram does not invent a database dependency for Flow.',
      ['Application service / repository', 'Transactions defined by your app', 'SQL, remote services or other storage'],
      null,
      null
    ),
    scanner: object(
      'Frontend dependency discovery',
      'build',
      'Bridge Java declarations to browser assets',
      'FrontendDependencies scans entry points and reachable class metadata for frontend requirements. Annotations such as @JsModule and @NpmPackage, theme configuration and frontend resources contribute to the build.',
      ['Entry-point and visited-class maps', 'Modules, packages and themes', 'ClassFinder and scanner machinery'],
      'scanner',
      'build/app'
    ),
    build: object(
      'Frontend build tasks',
      'build',
      'Prepare, generate, install, bundle',
      'Maven goals delegate to shared build utilities and NodeTasks. Options select the task sequence. Generated imports connect discovered requirements to the frontend build, with bundle reuse when applicable.',
      ['PrepareFrontendMojo', 'NodeTasks / TaskUpdateImports', 'BuildFrontendMojo → frontend bundler'],
      'tasks',
      'build/state'
    ),
    bundle: object(
      'The frontend bundle',
      'build',
      'Code the browser loads before UI updates',
      'The bundle contains executable browser code, components and styles. It is distinct from a UIDL message, which updates an already-running UI. Java Component classes are not compiled into browser-side view instances by this pipeline.',
      ['JavaScript and CSS assets', 'Flow client + application modules', 'Generated frontend entry points'],
      'build',
      'build/writer'
    )
  };
  const step = (node, title, body, packet, effect = {}) => ({ node, title, body, packet, effect });
  const scenarios = {
    click: {
      title: 'A click, end to end',
      action: 'Click the application',
      story: 'click',
      steps: [
        step(
          'browser',
          'A person clicks the button',
          'The visible counter is 7. The server has a Java view for this UI. Click the blue button in the scene to begin the round trip.',
          'Ready · browser = 7 · Java = 7'
        ),
        step(
          'dom',
          'A registered DOM listener fires',
          'The DOM binding reads the configured event data. It only reports interactions the server has asked to receive.',
          'click → node 7 → event data'
        ),
        step(
          'queue',
          'The browser queues an invocation',
          'The connector creates an event RPC. Deferred flushing lets the event handlers finish before the batch is sent.',
          '{ type: "event", node: 7, event: "click" }'
        ),
        step(
          'network',
          'A message crosses the network',
          'The invocation carries a node ID and event data. The Java listener itself stays on the server.',
          'Browser → server · interaction RPC'
        ),
        step(
          'session',
          'Acquire the session lock',
          'The server finds this UI. Processing enters the session’s lock before it touches shared UI state.',
          'UI #1 · enter protected session',
          { locked: true, thread: 'request' }
        ),
        step(
          'component',
          'Run the Java listener',
          'The listener increments the Java-side value to 8 and calls an Element operation to change the label. The browser still shows 7.',
          'counter++ → label.setText("8")',
          { server: 8, locked: true, thread: 'listener' }
        ),
        step(
          'server-tree',
          'Track changed UI state',
          'The Element mutation records changes in StateNode features. The owning tree tracks the affected nodes as dirty.',
          'StateNode → dirty set → NodeChanges',
          { dirty: true, locked: true }
        ),
        step(
          'writer',
          'Encode the UIDL response',
          'Before-response callbacks run. The writer serializes changes and instructions, then includes any new constants.',
          '{ changes: […], constants: {…}, … }',
          { dirty: false, locked: true }
        ),
        step(
          'network',
          'Return the state update',
          'The response crosses back to the browser. The Java objects remain in the heap; only the protocol representation travels.',
          'Server → browser · UIDL response',
          { locked: false, thread: 'idle' }
        ),
        step(
          'client-tree',
          'Update the client representation',
          'The client imports constants, attaches new nodes first, applies changes and flushes bindings to the DOM.',
          'JSON → client StateTree → DOM bindings',
          { client: 8 }
        ),
        step(
          'browser',
          'One click. One synchronized UI.',
          'The label now shows 8 without a page reload. The server-side view remains available for the next interaction.',
          'Browser = 8 · Java = 8 · no pending changes',
          { client: 8 }
        )
      ]
    },
    startup: {
      title: 'Open the application',
      action: 'Initialize a UI',
      story: 'startup',
      steps: [
        step(
          'bundle',
          'Load the frontend',
          'Static JavaScript and CSS reach the browser. This journey follows Flow’s client-driven initialization path.',
          'Load frontend assets',
          { client: '—', server: '—' }
        ),
        step(
          'browser',
          'Ask for a Flow UI',
          'Frontend code sends the initialization request and the initial location.',
          'INIT · location=/counter'
        ),
        step(
          'servlet',
          'Create session and UI context',
          'Bootstrap handling creates and initializes a UI using the shared server infrastructure.',
          'JavaScriptBootstrapHandler → UI',
          { locked: true, thread: 'request' }
        ),
        step(
          'service',
          'Resolve and instantiate the view',
          'Router resolves the route. Instantiator supplies the view and layout instances.',
          'Router → Instantiator → CounterView'
        ),
        step(
          'ui',
          'Attach the initial object graph',
          'UIInternals owns the new state tree. Components and elements make up the initial server-side UI.',
          'UI #1 → components → StateTree',
          { server: 7, dirty: true }
        ),
        step(
          'writer',
          'Send the initial state',
          'The server describes the initial tree and required client instructions.',
          'Initial UIDL · nodes + properties',
          { locked: false, dirty: false }
        ),
        step(
          'client-tree',
          'Bind the browser representation',
          'Client nodes and DOM bindings are created. The browser can now show the server-backed view.',
          'StateTree → DOM → visible counter',
          { client: 7 }
        ),
        step(
          'browser',
          'Ready for interaction',
          'The browser UI and Java view are connected through the synchronization protocol.',
          'Browser = 7 · Java = 7'
        )
      ]
    },
    navigation: {
      title: 'Navigate to a view',
      action: 'Navigate to /orders',
      story: 'navigation',
      steps: [
        step(
          'browser',
          'Request another location',
          'The person follows a route in the application.',
          '/counter → /orders'
        ),
        step(
          'network',
          'Send the navigation interaction',
          'Client-side routing integration asks Flow to navigate its server-side UI.',
          'Navigation request for UI #1'
        ),
        step(
          'service',
          'Resolve the route',
          'Router resolves the location to navigation state and a target.',
          'Route registry → target',
          { locked: true, thread: 'request' }
        ),
        step(
          'component',
          'Run the view lifecycle',
          'BeforeLeave can postpone navigation. On the successful path, target/layout instances and BeforeEnter processing determine the destination.',
          'BeforeLeave → Instantiator → BeforeEnter'
        ),
        step(
          'ui',
          'Display the route target',
          'The new component chain is displayed through UIInternals; AfterNavigation observers are notified.',
          'showRouteTarget → AfterNavigation',
          { route: '/orders', dirty: true }
        ),
        step(
          'writer',
          'Serialize the structural change',
          'The response describes the UI state changes resulting from navigation.',
          'UIDL · detach / attach / feature changes',
          { dirty: false, locked: false, thread: 'idle' }
        ),
        step(
          'browser',
          'Show the destination',
          'The browser reflects the destination view after processing the response. A route change does not imply a full browser reload.',
          'Visible route: /orders',
          { clientRoute: '/orders' }
        )
      ]
    },
    binding: {
      title: 'Edit and validate a field',
      action: 'Save a field value',
      story: 'binding',
      steps: [
        step(
          'browser',
          'Edit the name field',
          'The example uses buffered binding: editing a field does not immediately persist a bean.',
          'name = "Ada"',
          { form: true }
        ),
        step(
          'dom',
          'Capture the synchronized property',
          'The DOM binding reads the configured value property when its synchronization event occurs.',
          'value-change → property sync'
        ),
        step(
          'servlet',
          'Update the server-side field',
          'MapSyncRpcHandler handles the permitted property update. Deferred notifications run before ordinary event invocations.',
          'ElementPropertyMap ← "Ada"',
          { locked: true, thread: 'request' }
        ),
        step(
          'binder',
          'Convert and validate',
          'Binding chains convert presentation values and validate applied field bindings. Invalid fields stop the bean-writing phase.',
          'BindingImpl → converters → validators'
        ),
        step(
          'bean',
          'Write, then validate the bean',
          'This successful example writes the converted value and passes bean-level validation. Failed bean validation would restore captured bound values.',
          'bean.setName("Ada") → bean validators',
          { bean: 'Ada' }
        ),
        step(
          'server-tree',
          'Track resulting UI feedback',
          'Validation status and application feedback can change the UI. Those changes use the ordinary state tree.',
          'Validation status → UI state',
          { dirty: true }
        ),
        step(
          'writer',
          'Return the feedback',
          'The response conveys the resulting state. Saving to a database would be an explicit application operation.',
          'UIDL response · validation feedback',
          { dirty: false, locked: false, thread: 'idle' }
        ),
        step(
          'browser',
          'Show the accepted value',
          'The field and feedback now reflect this successful buffered write.',
          'Accepted: Ada · persistence not implied',
          { saved: true }
        )
      ]
    },
    push: {
      title: 'A background update',
      action: 'Run a background update',
      story: 'push',
      steps: [
        step(
          'threads',
          'Application work finishes',
          'A background task has a new value. It cannot safely mutate an attached UI directly without the session lock.',
          'Background result = 8',
          { thread: 'worker' }
        ),
        step(
          'access',
          'Submit UI.access',
          'The task submits a command to be executed with the UI’s session locked and current UI set.',
          'UI.access(command) → pending access queue'
        ),
        step(
          'session',
          'Enter the protected session',
          'The access command runs when the session lock can be held. Try “Hold lock” to see it wait here.',
          'Session lock → UI context',
          { locked: true, thread: 'access' }
        ),
        step(
          'component',
          'Update the Java UI',
          'The command changes the component. The browser has not yet received the new value.',
          'label.setText("8")',
          { server: 8, dirty: true }
        ),
        step(
          'push',
          'Push on automatic unlock',
          'With automatic push configured, session unlock coordinates delivery of the pending UI update.',
          'UidlWriter → AtmospherePushConnection',
          { locked: false, dirty: false, thread: 'idle' }
        ),
        step(
          'network',
          'Deliver the update',
          'A configured push transport carries the UIDL update without waiting for another user interaction.',
          'Server → browser · asynchronous UIDL'
        ),
        step(
          'client-tree',
          'Apply the same protocol',
          'The client applies changes to its state tree and DOM using the normal update machinery.',
          'MessageHandler → bindings',
          { client: 8 }
        ),
        step(
          'browser',
          'The page changes on its own',
          'The displayed value is now 8. Push changes delivery timing; locking and state synchronization still apply.',
          'Browser = 8 · Java = 8',
          { client: 8 }
        )
      ]
    },
    data: {
      title: 'Load application data',
      action: 'Fetch orders',
      story: 'navigation',
      steps: [
        step(
          'browser',
          'Ask for order rows',
          'This illustrative application uses a Grid backed by a DataProvider. Loading rows starts a server request; the database is application infrastructure.',
          'Grid requests rows',
          { clientRoute: '/orders', route: '/orders', orders: [] }
        ),
        step(
          'servlet',
          'Enter the UI request',
          'Flow handles the request in the UI context under the session lock.',
          'UI #1 · request',
          { locked: true, thread: 'request' }
        ),
        step(
          'provider',
          'Fetch a range',
          'DataCommunicator asks the DataProvider for a range of items. The provider belongs to the application and can use a repository or another data source.',
          'fetch(offset=0, limit=3)',
          { thread: 'fetch' }
        ),
        step(
          'database',
          'Query the application repository',
          'In this example the provider calls an application repository. Flow does not supply this database, schema, query, or transaction. Three illustrative order records are returned.',
          'Application code → repository → 3 orders',
          { queried: true }
        ),
        step(
          'provider',
          'Return application items',
          'The provider supplies a stream of application items. DataCommunicator prepares the range and its client representation.',
          'Stream<Order> → item data'
        ),
        step(
          'writer',
          'Encode the UI update',
          'Flow delivers the pending client updates and instructions. Java entities stay on the server; the browser receives their presentation data.',
          'UIDL + client instructions',
          { locked: false, thread: 'idle' }
        ),
        step(
          'client-tree',
          'Apply the client update',
          'Client-side state and pending instructions update the grid. The full Grid protocol is abstracted in this teaching model.',
          'Rows → grid rendering',
          {
            orders: [
              '1001        Ada            €120',
              '1002        Grace           €85',
              '1003        Linus          €210'
            ]
          }
        ),
        step(
          'browser',
          'Render the order rows',
          'The browser shows the three records. Fetching records did not persist a component, a UI, or the session.',
          '3 rows visible · application-owned data'
        )
      ]
    },
    build: {
      title: 'Build the browser half',
      action: 'Follow the frontend build',
      story: 'build',
      steps: [
        step(
          'scanner',
          'Declare frontend requirements',
          'Java annotations, application classes, themes and frontend files describe what the browser half needs.',
          '@JsModule · @NpmPackage · theme'
        ),
        step(
          'scanner',
          'Discover dependencies',
          'The scanner visits entry points and relevant reachable class metadata, aggregating frontend requirements.',
          'Entry points → modules + packages + assets'
        ),
        step(
          'build',
          'Prepare and generate',
          'Maven goals and shared utilities select NodeTasks to prepare files, generate imports and perform required installation work.',
          'Options → NodeTasks → generated imports'
        ),
        step(
          'bundle',
          'Build or reuse a bundle',
          'The build coordinator validates whether bundle generation is needed. Java stays on the server; browser modules become static assets.',
          'BuildFrontendMojo → build / reuse'
        ),
        step(
          'browser',
          'Load assets into the browser',
          'The browser loads executable JavaScript and CSS. Runtime startup and state synchronization are subsequent work.',
          'Static assets ≠ UIDL state updates'
        )
      ]
    }
  };
  window.FLOW_WORLD_DETAILS_CONTENT = { objects, scenarios };
})();
