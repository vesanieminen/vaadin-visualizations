/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  const node = (id, slot, title, symbol, subtitle, source) => ({ id, slot, title, symbol, subtitle, source });
  const step = (node, title, body, detail, source, packet) => ({ node, title, body, detail, source, packet });
  const runtime = [
    node('dom', 0, 'The page you see', 'Browser DOM', 'HTML elements · web components', 'binding'),
    node('client', 1, 'The browser engine', 'MessageHandler / StateTree', 'TypeScript · flow-client', 'message'),
    node('request', 2, 'Receive the interaction', 'UidlRequestHandler', 'Java · flow-server', 'request'),
    node('app', 3, 'Run your Java code', 'Component / Element', 'Your view & event listeners', 'component'),
    node('state', 4, 'Track what changed', 'StateTree / StateNode', 'One state tree per UI', 'state'),
    node('writer', 5, 'Send an update', 'UidlWriter', 'JSON changes · not a whole page', 'writer')
  ];
  const scenes = [
    {
      id: 'click',
      short: 'A click, end to end',
      eyebrow: 'THE ESSENTIAL ROUND TRIP',
      title: 'Java on the server.\nA living UI in the browser.',
      intro:
        'You write a Java listener. Flow carries the event to it, tracks the resulting UI changes, and updates the browser. Follow one click through the system.',
      lanes: ['IN THE BROWSER', 'ON THE JAVA SERVER'],
      nodes: runtime,
      demo: 'Click the example button',
      takeaway:
        'Your Java objects stay on the server. The browser gets the UI state it needs, and sends registered interactions back.',
      steps: [
        step(
          'dom',
          'A real DOM event starts the trip',
          'The user clicks an element with a server-side listener. The browser is running normal HTML and web components.',
          'SimpleElementBindingStrategy installs DOM listeners described by the server. It evaluates configured event data and filters; Flow does not send every browser event to Java.',
          'binding',
          'click → registered DOM listener'
        ),
        step(
          'client',
          'The client queues an RPC',
          'Flow describes the interaction using a state-node ID, event type, and event data. It queues the message for the server.',
          'StateTree.sendEventToServer delegates to ServerConnector. ServerRpcQueue batches invocations; MessageSender sends them using the available transport. IDs identify nodes, not Java objects sent over the network.',
          'connector',
          '{ type: "event", node: 7, event: "click", data: {} }'
        ),
        step(
          'request',
          'Find the UI and dispatch the event',
          'The server locates the UI for this request and processes the event while protecting session state with a lock.',
          'UidlRequestHandler calls ServerRpcHandler, then writes a response. EventRpcHandler resolves the state node and fires a DomEvent through ElementListenerMap. Synchronized properties are applied before other invocations.',
          'event',
          'UIDL request → UI → node 7 → listener'
        ),
        step(
          'app',
          'Your Java listener runs',
          'The example listener changes a label. This is ordinary Java code operating on a server-side component.',
          'Component exposes an Element. Element.setText updates the server-side element representation, including child text nodes. Application services and database calls are your application’s responsibility.',
          'element',
          'button.addClickListener(e → label.setText("Clicked!"))'
        ),
        step(
          'state',
          'The change is recorded',
          'Flow marks affected state nodes as dirty. It can collect just the changes made since the last synchronization.',
          'StateTree.collectChanges gathers dirty nodes and asks each StateNode to emit NodeChanges. Node features separate properties, children, listeners and other aspects of state.',
          'state',
          'UI → StateTree → dirty StateNode → NodeChange'
        ),
        step(
          'writer',
          'Describe the update as JSON',
          'Flow builds a UIDL response containing state changes and any pending client instructions.',
          'UidlWriter runs beforeClientResponse callbacks, encodes changes, captures pending JavaScript, then dumps new constants. The client reads constants before applying changes. The packet below is conceptual, not an exact wire dump.',
          'encode',
          '{ changes: [ … ], execute: [ … ], constants: { … } }'
        ),
        step(
          'client',
          'Apply changes to the client tree',
          'The browser engine updates its local state tree and the bindings that connect that tree to the DOM.',
          'MessageHandler imports constants first. TreeChangeProcessor attaches new nodes before processing other changes. Reactive bindings flush the resulting changes to real browser nodes.',
          'changes',
          'JSON → client StateTree → DOM bindings'
        ),
        step(
          'dom',
          'The page reflects the Java change',
          'The label now reads “Clicked!”. The page did not need a full reload. The next interaction starts the same cycle.',
          'The UI is synchronized, not recreated on every click. Server updates can also be delivered over push; the state-tree and DOM-binding machinery is shared.',
          'binding',
          'label.textContent = "Clicked!"'
        )
      ]
    },
    {
      id: 'startup',
      short: 'Opening the application',
      eyebrow: 'FROM AN EMPTY TAB TO A VIEW',
      title: 'A page becomes\na server-backed UI.',
      intro:
        'Follow the client-driven bootstrap path: load the frontend, ask the server to create a UI, then connect its initial state to the page.',
      lanes: ['IN THE BROWSER', 'ON THE JAVA SERVER'],
      nodes: [
        runtime[0],
        runtime[1],
        node(
          'request',
          2,
          'Start a Flow UI',
          'JavaScriptBootstrapHandler',
          'The client-driven start request',
          'bootstrap'
        ),
        node(
          'app',
          3,
          'Create the initial view',
          'Router / Instantiator',
          'Resolve the route & create components',
          'router'
        ),
        runtime[4],
        runtime[5]
      ],
      takeaway:
        'A VaadinSession can own multiple UIs. Each UI has its own component state tree; the session lock protects their shared session state.',
      steps: [
        step(
          'dom',
          'Load the application shell',
          'The browser loads the page and frontend assets, including the Flow client. That alone is not yet a live server-side view.',
          'This story follows client-driven initialization. JavaScriptBootstrapHandler also documents the start request used to lazily initialize Flow views in client applications; other bootstrap entry paths exist.',
          'bootstrap',
          'HTML shell + frontend assets'
        ),
        step(
          'client',
          'Ask to start Flow',
          'The client asks the server for the information needed to initialize a Flow UI.',
          'The start request includes browser and location information. Bootstrap is distinct from the regular UIDL event requests used after initialization.',
          'bootstrap',
          'start request + location + browser details'
        ),
        step(
          'request',
          'Associate a session and a UI',
          'Flow creates or finds the session and initializes a UI for this browser view.',
          'VaadinService coordinates request handling; VaadinSession stores UIs. A UI owns UIInternals, including its StateTree. Do not confuse a UI instance with an HTTP request or with the whole session.',
          'internals',
          'VaadinService → VaadinSession → UI → UIInternals'
        ),
        step(
          'app',
          'Resolve and construct the view',
          'The router resolves the location and obtains the view through Flow’s instantiation mechanism.',
          'Instantiator is the extension point that lets integrations such as Spring provide dependency injection. Routing and bootstrap work are in flow-server, not a separate router module.',
          'instantiator',
          'location → route target → Instantiator'
        ),
        step(
          'state',
          'Build the initial state tree',
          'The new Java component hierarchy contributes elements and state nodes to this UI.',
          'Component wraps Element; Element is backed by a StateNode with features. UIInternals owns the root StateTree. Server-side state includes more than rendered HTML.',
          'node',
          'UI → components → elements → state nodes'
        ),
        step(
          'writer',
          'Send initial UI state',
          'The bootstrap response supplies what the client needs to begin synchronization.',
          'JavaScriptBootstrapHandler extends BootstrapHandler and returns initialization JSON. The initial state and subsequent changes use Flow’s state synchronization machinery.',
          'bootstrap',
          'initialization data + initial UI state'
        ),
        step(
          'client',
          'Create browser-side bindings',
          'The browser engine creates its state tree and binds nodes to DOM elements.',
          'TreeChangeProcessor processes attachment changes before other changes so referenced nodes are available. Element bindings then update properties, child nodes and event listeners.',
          'changes',
          'attach nodes → apply features → bind DOM'
        ),
        step(
          'dom',
          'Ready for interaction',
          'The view is now visible and its registered interactions can make the round trip to Java.',
          'A server-side UI has a lifecycle. Heartbeats and session cleanup matter for long-lived tabs; the visualization intentionally leaves retries and expiration outside the happy-path sequence.',
          'ui',
          'ready → listen for user input'
        )
      ]
    },
    {
      id: 'navigation',
      short: 'Moving between views',
      eyebrow: 'ROUTING & VIEW LIFECYCLE',
      title: 'A URL becomes\na Java component.',
      intro:
        'Routing is more than matching a path. Flow coordinates leaving a view, entering the next one, building its layout chain, and synchronizing the result.',
      lanes: ['IN THE BROWSER', 'ON THE JAVA SERVER'],
      nodes: [
        runtime[0],
        runtime[1],
        node('request', 2, 'Resolve the destination', 'Router', '@Route & the route registry', 'router'),
        node(
          'app',
          3,
          'Run the navigation lifecycle',
          'AbstractNavigationStateRenderer',
          'BeforeLeave → BeforeEnter → AfterNavigation',
          'navigation'
        ),
        runtime[4],
        runtime[5]
      ],
      takeaway:
        'Navigation changes the component hierarchy of a UI. It then reaches the browser through the same state synchronization used by a click.',
      steps: [
        step(
          'dom',
          'Choose a destination',
          'A user follows a router link, changes history, or triggers Java code that calls UI.navigate.',
          'Flow supports several navigation triggers. This sequence focuses on a normal successful in-application navigation; redirects, errors and postponed navigation branch from it.',
          'router',
          '/orders → /customers'
        ),
        step(
          'request',
          'Resolve the route',
          'The router matches the location against registered routes and resolves a navigation target.',
          'Routes can be discovered from @Route annotations or registered programmatically. Router coordinates route resolution in flow-server.',
          'router',
          'location → NavigationState'
        ),
        step(
          'app',
          'Give the current view a chance to leave',
          'Before-leave observers can postpone navigation, for example while the user decides whether to discard edits.',
          'AbstractNavigationStateRenderer handles BeforeLeave before continuing. A postponed or rerouted transition does not simply fall through the successful path shown here.',
          'navigation',
          'BeforeLeave → continue / postpone / reroute'
        ),
        step(
          'app',
          'Create and enter the target',
          'Flow obtains the target and parent layouts through Instantiator, and runs before-enter logic.',
          'BeforeEnter may reroute or forward. Existing chain elements may be reused; new instances are created as needed. DI integrations can control how route targets are instantiated.',
          'instantiator',
          'Instantiator → layout chain → BeforeEnter'
        ),
        step(
          'state',
          'Install the view hierarchy',
          'The UI switches to the target view and its layouts. After-navigation observers see the completed navigation.',
          'The renderer calls UIInternals.showRouteTarget and then handles AfterNavigation. Attaching and detaching component elements produces state-tree changes.',
          'navigation',
          'showRouteTarget → AfterNavigation'
        ),
        step(
          'writer',
          'Synchronize the new view',
          'Flow serializes the component changes for the browser.',
          'The same UidlWriter and state-tree change machinery used for ordinary interactions describes the new hierarchy. Routing does not require Java view classes to run in the browser.',
          'writer',
          'attach / detach / property changes'
        ),
        step(
          'dom',
          'Display the destination',
          'The browser reflects the new view. Further interactions use the same UI synchronization loop.',
          'History integration keeps navigation and the location in step. Not every navigation recreates the entire UI or session.',
          'router',
          'current view: Customers'
        )
      ]
    },
    {
      id: 'push',
      short: 'Updates without a click',
      eyebrow: 'CONCURRENCY & SERVER PUSH',
      title: 'The server has news.\nThe browser gets the update.',
      intro:
        'A background task finishes while the user is idle. Follow the update through UI.access, the session lock, and an enabled push connection.',
      lanes: ['IN THE BROWSER', 'ON THE JAVA SERVER'],
      nodes: [
        runtime[0],
        runtime[1],
        node('request', 2, 'Queue safe UI work', 'UI.access', 'A background task enters the UI', 'ui'),
        node('app', 3, 'Hold the session lock', 'VaadinSession', 'Serialize access to session state', 'session'),
        runtime[4],
        node('writer', 5, 'Push the changes', 'AtmospherePushConnection', 'Push enabled · automatic mode', 'push')
      ],
      takeaway:
        'UI.access makes background UI work safe. Push delivers the resulting changes without waiting for the next browser request. These solve different problems.',
      steps: [
        step(
          'request',
          'A background task finishes',
          'Your application has new data. Use a captured, attached UI to schedule the component update with UI.access.',
          'UI.access delegates work to the session’s access queue and returns a Future. A worker thread cannot assume UI.getCurrent() is set, and the UI may have detached.',
          'ui',
          'ui.access(() → label.setText("Done"))'
        ),
        step(
          'app',
          'Execute with the session lock',
          'Flow runs the update while it has exclusive access to session state.',
          'UI.accessSynchronously verifies session access, acquires the session lock and sets current instances. Pending access tasks are drained while the lock is held.',
          'ui',
          'queue → session lock → command'
        ),
        step(
          'state',
          'Record the UI mutation',
          'The background update changes the same Java component state as a click listener would.',
          'StateTree and StateNode track dirty state. Push does not introduce a separate rendering model or a second component tree.',
          'state',
          'label change → dirty state node'
        ),
        step(
          'writer',
          'Send over the push connection',
          'With automatic push enabled, Flow sends pending UI changes as the outermost session lock is released.',
          'VaadinSession.unlock drains pending access tasks and invokes UI.push for AUTOMATIC mode. AtmospherePushConnection uses UidlWriter to produce the update. Manual mode requires an explicit push; disabled push waits for a later synchronization.',
          'session',
          'automatic push → UIDL → connection'
        ),
        step(
          'client',
          'Process the incoming update',
          'The client handles the update through its usual message and state-tree processors.',
          'Push is commonly WebSocket-based; Atmosphere supports transport configuration and fallback. The mechanism here is UI push, distinct from the browser notification API in flow-webpush.',
          'message',
          'push message → MessageHandler → changes'
        ),
        step(
          'dom',
          'The idle page changes',
          'The user sees “Done” without initiating another request.',
          'UI.access provides locking, not automatic push configuration. A live connection and an attached UI are assumptions of this successful path.',
          'push',
          'label.textContent = "Done"'
        )
      ]
    },
    {
      id: 'binding',
      short: 'From a field to a bean',
      eyebrow: 'BINDING & VALIDATION',
      title: 'A form value becomes\nvalidated Java data.',
      intro:
        'Flow synchronizes field values; Binder connects those fields to a Java bean. Explore a buffered form that explicitly writes its values when the user saves.',
      lanes: ['IN THE BROWSER', 'ON THE JAVA SERVER'],
      nodes: [
        node('dom', 0, 'Edit a field', 'Browser field element', 'The user changes a value', 'binding'),
        runtime[1],
        node(
          'request',
          2,
          'Synchronize the property',
          'MapSyncRpcHandler',
          'Client property → server-side field',
          'sync'
        ),
        node('app', 3, 'Convert and validate', 'Binder', 'Field bindings & validators', 'binder'),
        node('state', 4, 'Write the Java bean', 'Binder.doWriteIfValid', 'Write values · validate the bean', 'binder'),
        runtime[5]
      ],
      takeaway:
        'Binder coordinates fields, conversion and validation. It does not persist data to a database. Your application decides when and how to save.',
      steps: [
        step(
          'dom',
          'The user edits a field',
          'A field’s configured change event synchronizes its value with the server.',
          'Synchronization depends on the component and its value-change mode. Flow does not transmit every keystroke unconditionally.',
          'binding',
          'field.value = "Ada"'
        ),
        step(
          'request',
          'Update the server-side property',
          'The client sends the synchronized property value so Java sees the new field state.',
          'ServerRpcHandler applies all map-sync values in a request before firing deferred change events and dispatching other invocations. This gives listeners an updated state tree.',
          'rpc',
          'map sync → property values → change events'
        ),
        step(
          'app',
          'Save invokes the Binder pipeline',
          'For this buffered form, application code calls writeBeanIfValid when the user chooses Save.',
          'This story assumes readBean plus an explicit write. setBean is a different mode: it attempts writes on field changes. Bindings combine getter/setter access, converters and validators.',
          'binder',
          'binder.writeBeanIfValid(person)'
        ),
        step(
          'app',
          'Validate field values first',
          'Bindings run their conversion and field-validation pipelines. Invalid fields prevent a successful write.',
          'doWriteIfValid collects field validation results before writing the bean. Validation status handlers can mark the fields invalid and show messages.',
          'binder',
          'field validation → errors? stop and report'
        ),
        step(
          'state',
          'Write, then check bean-level rules',
          'If field validation passes, Binder writes the converted values and validates the resulting bean.',
          'Binder stores old values before writing. If bean-level validation fails, it restores those values through the bindings. This is not a database transaction and does not undo arbitrary setter side effects.',
          'binder',
          'save old values → write → validate bean → restore if invalid'
        ),
        step(
          'writer',
          'Show the result',
          'Validation messages or application confirmation update the UI through the regular synchronization loop.',
          'Application code checks the boolean result before persisting data. The framework’s responsibility ends at binding and validation; persistence belongs to your application.',
          'binder',
          'valid → application may persist; invalid → show feedback'
        ),
        step(
          'dom',
          'The form reflects its status',
          'The user sees the validation feedback or the confirmation of a successful save.',
          'For tables and large result sets, look at DataProvider and DataCommunicator instead of Binder. They solve fetching and sending ranges of items, a different data problem.',
          'data',
          'feedback → correct input or continue'
        )
      ]
    },
    {
      id: 'build',
      short: 'How the frontend is built',
      eyebrow: 'BUILD TIME MEETS RUNTIME',
      title: 'Java dependencies in.\nBrowser assets out.',
      intro:
        'A Java application still needs browser code. Flow’s build tooling discovers frontend dependencies, prepares generated files, and coordinates the frontend bundle.',
      lanes: ['YOUR APPLICATION', 'THE BUILD TOOLCHAIN'],
      nodes: [
        node(
          'dom',
          0,
          'Declare the application',
          'Java classes & frontend files',
          '@NpmPackage · @JsModule · themes',
          'scanner'
        ),
        node('client', 1, 'Serve browser assets', 'Frontend bundle', 'JavaScript · CSS · static resources', 'build'),
        node(
          'request',
          2,
          'Prepare the frontend',
          'PrepareFrontendMojo',
          'Maven entry point · shared utilities',
          'prepare'
        ),
        node(
          'app',
          3,
          'Discover dependencies',
          'FrontendDependencies',
          'Scan application & dependency classes',
          'scanner'
        ),
        node('state', 4, 'Generate and install', 'NodeTasks', 'Imports · packages · build configuration', 'tasks'),
        node(
          'writer',
          5,
          'Build or reuse a bundle',
          'BuildFrontendMojo / Vite',
          'Production assets for the application',
          'build'
        )
      ],
      takeaway:
        'The Java framework and browser bundle meet at runtime, but asset discovery and bundling are a separate pipeline. Start in flow-plugins and flow-build-tools for build problems.',
      steps: [
        step(
          'dom',
          'Start with application declarations',
          'The application and its dependencies declare frontend modules, packages, styles and other resources.',
          'Java-side component metadata helps the tooling discover what the browser needs. Custom frontend files can also contribute to the application.',
          'scanner',
          '@NpmPackage + @JsModule + local frontend files'
        ),
        step(
          'request',
          'Run frontend preparation',
          'The Maven plugin prepares build information and delegates the frontend work to shared tooling.',
          'PrepareFrontendMojo calls BuildFrontendUtil.prepareFrontend. flow-plugins has Maven and Gradle entry points; shared build logic lives below them.',
          'prepare',
          'prepare-frontend → BuildFrontendUtil'
        ),
        step(
          'app',
          'Scan the dependency graph',
          'The tooling discovers frontend resources referenced by application and dependency classes.',
          'FrontendDependencies implements the scanner. BuildFrontendMojo chooses scanner options and uses the results when running the node updater.',
          'scanner',
          'classes + annotations → frontend dependency inventory'
        ),
        step(
          'state',
          'Prepare the browser project',
          'Tasks generate imports and configuration, copy resources and install packages as needed.',
          'NodeTasks assembles conditional work, including TaskUpdateImports, package management and Vite configuration. This is a conceptual sequence: the actual tasks depend on build options and existing bundles.',
          'tasks',
          'dependency inventory → generated frontend files'
        ),
        step(
          'writer',
          'Produce or reuse the bundle',
          'The build creates frontend assets when required. Flow can also use an applicable prebuilt bundle.',
          'BuildFrontendMojo calls runFrontendBuild only when generateBundle and needsBundleBuild require it. Development uses a separate dev-server workflow; Vite is not run for every UI event.',
          'build',
          'needs build? → Vite build : reuse bundle'
        ),
        step(
          'client',
          'Load the assets at runtime',
          'The deployed app serves the JavaScript and CSS that the browser needs to run its side of Flow.',
          'This checkout ships the Flow client as TypeScript sources in its JAR; the application’s frontend build compiles them. Build tooling is separate from request handling and UI state synchronization.',
          'repository',
          'built assets → browser → Flow bootstrap'
        )
      ]
    }
  ];
  const concepts = [
    [
      'mental-model',
      'The central idea',
      'Your UI is a Java object graph on the server, backed by a state tree. Flow synchronizes the parts the browser needs and sends registered interactions back.',
      'Do not imagine Java components running in the browser, or a complete page reload after each interaction.',
      'architecture',
      'click'
    ],
    [
      'scopes',
      'Service → session → UI',
      'VaadinService handles framework services and requests. VaadinSession holds session-scoped state and can contain multiple UIs. Each UI owns its state tree through UIInternals.',
      'Two browser tabs commonly have separate UIs in the same session. The lock belongs to the session, so their work can contend for it.',
      'internals',
      'startup'
    ],
    [
      'component',
      'Component → Element → StateNode',
      'Component is the Java UI API. Element is the server-side DOM abstraction. StateNode stores the state, split into features for properties, children, listeners and more.',
      'A state node is not simply a component. Text nodes and internal state also participate; not every node feature is sent to the browser.',
      'node',
      'click'
    ],
    [
      'uidl',
      'UIDL & the constant pool',
      'UIDL is Flow’s UI synchronization response. It carries changes and pending client instructions. A per-UI constant pool avoids resending repeated listener settings and JavaScript definitions.',
      'The server collects changes, pending JavaScript, then constants. The client consumes constants first, changes second, and JavaScript after DOM updates flush.',
      'protocol',
      'click'
    ],
    [
      'events',
      'Events & property synchronization',
      'A registered DOM listener describes which event data to send. Map synchronization carries client property values back to Java.',
      'ServerRpcHandler applies synchronized values before firing change events and processing other invocations. The application sees a consistent set of field values from the request.',
      'rpc',
      'binding'
    ],
    [
      'locking',
      'UI.access & the session lock',
      'UI.access schedules work that touches a UI with the session lock held. Use it for background work that needs to update components.',
      'Safe access and delivery are separate: push must be enabled for an idle browser to receive an immediate update. Avoid long-running work under the lock.',
      'ui',
      'push'
    ],
    [
      'push',
      'UI push versus Web Push',
      'UI push sends changes to an open Flow UI through its connection. flow-webpush is a separate module for browser push notifications.',
      'Adding UI.access does not by itself turn on push, and notification subscriptions are not a replacement for the UI synchronization connection.',
      'push',
      'push'
    ],
    [
      'routing',
      'Routes & the view lifecycle',
      'Router matches locations to registered targets. The navigation renderer coordinates leave/enter observers, view and layout instantiation, and after-navigation events.',
      'Navigation can be postponed, rerouted or forwarded. It is not just a constructor call followed by replacing the HTML.',
      'navigation',
      'navigation'
    ],
    [
      'di',
      'Instantiator & integrations',
      'Instantiator is the factory extension point for views and other framework-created objects. Spring, CDI and Quarkus integrate Flow into their environments.',
      'An application does not need all integrations. They adapt the same Flow core to different containers; they are not steps in one request pipeline.',
      'instantiator',
      'startup'
    ],
    [
      'binder',
      'Binder is not persistence',
      'Binder connects fields to bean properties through converters and validators. readBean/writeBean provide explicit writes; setBean keeps a bound bean updated as fields change.',
      'Database access and transactions remain application responsibilities. Bean-level validation may restore previously written values but cannot undo arbitrary side effects.',
      'binder',
      'binding'
    ],
    [
      'data',
      'DataProvider & DataCommunicator',
      'DataProvider supplies items. DataCommunicator coordinates requested item ranges and the data sent to components such as grids.',
      'Range-based fetching supports large datasets. It is a different layer from Binder, which connects individual form fields to values.',
      'data',
      'binding'
    ],
    [
      'javascript',
      'Calling JavaScript from Java',
      'executeJs queues a client invocation. Flow encodes its parameters, includes it in a response when its owner can be sent, and executes it after state changes have reached the DOM.',
      'Pass values as parameters. This checkout also supports declared JavaScript definitions resolved from the bundle; inspect the wire-protocol guide for the exact shapes.',
      'protocol',
      'click'
    ],
    [
      'signals',
      'Reactive values & UI state',
      'This checkout includes signals and reactive bindings in the Java framework. They can drive component state when values change.',
      'A signal is not the network protocol. UI changes still go through the Element/state-tree machinery. Explore Element’s binding APIs in the full source.',
      'element',
      'click'
    ],
    [
      'buildtime',
      'Build time versus request time',
      'The plugin and build tools prepare the browser’s code and assets. The server and client engines synchronize UI state while the application runs.',
      'You can investigate a missing frontend import in build tooling without confusing it with routing or RPC dispatch.',
      'tasks',
      'build'
    ]
  ].map(([id, title, body, nuance, source, scene]) => ({ id, title, body, nuance, source, scene }));
  const modules = {
    'flow-server': [
      'Core runtime',
      'The Java heart of Flow',
      'Components, elements, state trees, routing, request handling, bootstrap and internal integration points.',
      'state'
    ],
    'flow-client': [
      'Core runtime',
      'The browser half',
      'TypeScript message handling, state-tree processing, reactive DOM bindings and transport.',
      'message'
    ],
    'flow-data': [
      'UI building blocks',
      'Fields, beans & item ranges',
      'Binder, converters, validation, data providers and DataCommunicator.',
      'binder'
    ],
    'flow-html-components': [
      'UI building blocks',
      'Java wrappers for HTML',
      'Basic elements such as Div and Anchor. The complete Vaadin component suite is not all implemented in this repository.',
      'component'
    ],
    'flow-dnd': [
      'UI building blocks',
      'Drag and drop',
      'Server-side drag sources, drop targets and drag/drop events.',
      'element'
    ],
    'flow-react': [
      'UI building blocks',
      'React integration',
      'Infrastructure for integrating React-backed UI with Flow.',
      'repository'
    ],
    'flow-lit-template': [
      'UI building blocks',
      'Lit template integration',
      'Connect Java components to Lit templates and their elements.',
      'element'
    ],
    'flow-polymer-template': [
      'UI building blocks',
      'Legacy Polymer integration',
      'Support for the older Polymer template model.',
      'repository'
    ],
    'flow-push': [
      'Core runtime',
      'UI push resources',
      'Packages the push transport dependencies and resources. Server-side connection classes live in flow-server.',
      'push'
    ],
    'flow-webpush': [
      'UI building blocks',
      'Browser push notifications',
      'Web Push subscription and notification support; separate from live UI push.',
      'repository'
    ],
    'flow-plugins': [
      'Build & development',
      'Build entry points',
      'Maven and Gradle plugins, shared plugin base and the dev-bundle plugin.',
      'build'
    ],
    'flow-build-tools': [
      'Build & development',
      'Frontend build machinery',
      'Dependency scanners, NodeTasks, package installation and bundled Vite/theme plugins.',
      'tasks'
    ],
    'vaadin-dev-server': [
      'Build & development',
      'Development mode',
      'Development tooling, frontend server integration and browser-side developer tools.',
      'repository'
    ],
    'flow-devloop-daemon': [
      'Build & development',
      'The vaadin-dev loop',
      'Daemon for the local development loop, including build and restart coordination.',
      'repository'
    ],
    'flow-polymer2lit': [
      'Build & development',
      'Template migration tool',
      'Converts Polymer templates toward Lit.',
      'repository'
    ],
    'vaadin-spring': [
      'Container integrations',
      'Spring integration',
      'Spring-aware instantiation, scopes, servlet setup and security integration.',
      'instantiator'
    ],
    'vaadin-cdi': [
      'Container integrations',
      'Jakarta CDI integration',
      'Connects Flow objects and lifecycle to a CDI container.',
      'instantiator'
    ],
    'vaadin-quarkus': [
      'Container integrations',
      'Quarkus extension',
      'Runtime integration and deployment-time build steps.',
      'instantiator'
    ],
    flow: [
      'Packaging & tests',
      'Application dependency aggregate',
      'A POM that gathers the Flow modules an application needs.',
      'repository'
    ],
    'flow-bom': [
      'Packaging & tests',
      'Version alignment',
      'Bill of materials for consistent dependency versions.',
      'repository'
    ],
    'flow-server-production-mode': [
      'Packaging & tests',
      'Production configuration',
      'Wrapper artifact that enables production mode via web-fragment.xml.',
      'repository'
    ],
    'flow-tests': [
      'Packaging & tests',
      'Integration test applications',
      'Browser-facing test applications exercising the framework as a whole. Activated through a root Maven profile.',
      'repository'
    ],
    'flow-test-util': [
      'Packaging & tests',
      'Integration test support',
      'TestBench base classes and test application helpers.',
      'repository'
    ],
    'flow-test-generic': [
      'Packaging & tests',
      'Shared test utilities',
      'General testing support used across modules.',
      'repository'
    ],
    'flow-html-components-testbench': [
      'Packaging & tests',
      'HTML test elements',
      'TestBench element wrappers for Flow HTML components.',
      'repository'
    ]
  };
  window.FLOW_CONTENT = { scenes, concepts, modules };
})();
