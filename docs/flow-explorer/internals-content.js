/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
(() => {
  // Curated against the bundled commit. Every part has an implementation anchor.
  const part = (name, role, body, source, marker) => ({ name, role, body, source, marker });
  const step = (title, body, part) => ({ title, body, part });
  const profiles = {
    dom: {
      title: 'The DOM binding',
      kind: 'BROWSER · TYPESCRIPT',
      intro:
        'A binding connects a client-side StateNode to a real DOM node. The DOM supplies native events and rendering; Flow supplies the state and the rules for synchronizing it.',
      assembly:
        'SimpleElementBindingStrategy is a module of binding functions. A BindingContext groups the state node, its HTML node and the BinderContext used to create and bind children.',
      parts: [
        part(
          'BindingContext',
          'Pairs state with a DOM node',
          'This context carries the client StateNode, htmlNode and binderContext through the binding functions. It is browser-side plumbing, unrelated to the Java form Binder.',
          'binding',
          'class BindingContext'
        ),
        part(
          'Property bindings',
          'Keep the element in sync',
          'MapProperty changes drive DOM properties. Other binding functions handle attributes, style, visibility and child lists. State changes trigger reactive work rather than a complete page render.',
          'binding',
          'function bindProperty('
        ),
        part(
          'Child bindings',
          'Build the DOM hierarchy',
          'The element child list creates and binds new child nodes and removes old children. Virtual children and shadow roots have their own handling, because DOM placement is not always ordinary light DOM nesting.',
          'binding',
          'function bindChildren('
        ),
        part(
          'Event bridge',
          'Capture configured interactions',
          'handleDomEvent reads the listener configuration through the constant pool, evaluates requested event-data expressions, and coordinates property synchronization with the event RPC.',
          'binding',
          'function handleDomEvent('
        )
      ],
      flow: [
        step('Bind', 'Associate the client node with an element and install its bindings.', 0),
        step('Observe', 'Changes to feature maps and lists update DOM properties and children.', 1),
        step('Report', 'Registered DOM events send selected event data back to Java.', 3)
      ],
      rule: 'Flow only reports interactions configured by server-side listeners and synchronization settings. An arbitrary browser event does not automatically become a Java event.'
    },
    client: {
      title: 'The browser engine',
      kind: 'BROWSER · TYPESCRIPT',
      intro:
        'The browser has its own state tree, an outgoing RPC queue and a response processor. These cooperate through the client Registry; they do not run your server-side Java view.',
      assembly:
        'StateTree hands interactions to ServerConnector. The connector creates protocol invocations; ServerRpcQueue batches them, MessageSender chooses when to send, and MessageHandler applies the response.',
      parts: [
        part(
          'StateTree → ServerConnector',
          'Turn an interaction into an RPC',
          'The client tree identifies the node. ServerConnector creates a protocol event with its node ID, event name and event data. The ID lets the server find the corresponding node in its UI.',
          'connector',
          'sendEventMessage('
        ),
        part(
          'ServerRpcQueue',
          'Batch outgoing work',
          'An array holds pending invocations. A flushPending flag prevents duplicate scheduling. Deferred flushing lets the current set of event handlers finish before the queue is sent.',
          'queue',
          'export class ServerRpcQueue'
        ),
        part(
          'MessageSender',
          'Coordinate transport and ordering',
          'The sender waits if a request is active or a configured push connection is not active. It checks UI lifecycle state and sends retained messages before fresh queued invocations.',
          'sender',
          'sendInvocationsToServer():'
        ),
        part(
          'MessageHandler → TreeChangeProcessor',
          'Decode and apply the response',
          'MessageHandler imports constants before processing changes. TreeChangeProcessor attaches all new nodes before applying other changes, so references between nodes can resolve. Reactive bindings then update the DOM.',
          'message',
          'protected handleJSON('
        )
      ],
      flow: [
        step('Queue', 'Node identity and interaction data become queued RPCs.', 0),
        step('Send', 'Deferred flushing and request state determine when data leaves the browser.', 2),
        step('Apply', 'Response metadata, constants and changes update the client tree.', 3)
      ],
      rule: 'Client and server trees represent corresponding UI state, but they are different objects in different runtimes. Synchronization uses protocol messages and node IDs.'
    },
    request: {
      title: 'The UIDL request pipeline',
      kind: 'SERVER · JAVA',
      intro:
        'An incoming interaction passes through request handling, UI lookup and RPC dispatch before it reaches a component listener. The response is built from the same UI’s state tree.',
      assembly:
        'VaadinService coordinates request handling. UidlRequestHandler processes a UIDL request under the session lock and delegates the payload to ServerRpcHandler. Type-specific handlers interpret individual invocations.',
      parts: [
        part(
          'VaadinService',
          'Coordinate the request',
          'The service establishes the Flow request context and chooses request handlers. A VaadinSession can contain multiple UIs; the request must be associated with the intended UI.',
          'service',
          'public void handleRequest('
        ),
        part(
          'UidlRequestHandler',
          'Pair RPC processing with a response',
          'The handler calls ServerRpcHandler for the incoming request and UidlWriter to produce the resulting UI update. This is the bridge between request/response transport and the UI protocol.',
          'request',
          'getRpcHandler().handleRpc('
        ),
        part(
          'ServerRpcHandler',
          'Order the invocations',
          'Property synchronization runs before other RPC invocations. Deferred property-change callbacks are collected and run before event invocations, so listeners can see updated field values.',
          'rpc',
          'private void handleInvocations('
        ),
        part(
          'EventRpcHandler',
          'Reach the element listener',
          'The handler constructs a DomEvent for the resolved StateNode and fires it through ElementListenerMap. Component event plumbing can translate that DOM event into the Java API used by a view.',
          'event',
          'public Optional<Runnable> handleNode('
        )
      ],
      flow: [
        step('Enter', 'Resolve request, session and UI context.', 0),
        step('Dispatch', 'Apply property updates, then deliver the event to its node.', 2),
        step('Respond', 'Collect the resulting UI changes into a UIDL response.', 1)
      ],
      rule: 'A client-supplied node ID is interpreted within a specific UI. The actual handlers also enforce protocol, node and interaction constraints; it is not unrestricted invocation of arbitrary Java methods.'
    },
    component: {
      title: 'Component → Element → state',
      kind: 'SERVER · JAVA',
      intro:
        'Your component is a Java API around an element representation. Changing it changes server-side state; that state is synchronized to a corresponding browser element.',
      assembly:
        'Component owns its root Element. Element wraps a StateNode through an element state provider. Node features hold separate aspects of element state, such as properties, attributes, children and listeners.',
      parts: [
        part(
          'Component',
          'The application-facing object',
          'Component.getElement supplies the root element, creating it lazily if needed. Component APIs can wrap lower-level Element operations and add typed events, validation or composition.',
          'component',
          'public Element getElement()'
        ),
        part(
          'Element',
          'The server-side DOM API',
          'Element.setText updates the server representation of text and children. It does not call the browser DOM directly; the change becomes state that Flow later serializes.',
          'element',
          'public Element setText('
        ),
        part(
          'StateNode',
          'Store state in features',
          'A node has an owner, parent and ID. Feature instances are created as needed. Features divide the node’s state into maps, lists and other protocol-specific structures.',
          'node',
          'public void markAsDirty()'
        ),
        part(
          'UIInternals',
          'Connect to the owning UI',
          'UIInternals owns the UI’s StateTree and other internal lifecycle and synchronization data. It connects component state to the machinery that communicates with the client.',
          'internals',
          'public StateTree getStateTree()'
        )
      ],
      flow: [
        step('Call Java', 'A listener calls a component or Element method.', 0),
        step('Change state', 'The corresponding feature records the mutation.', 2),
        step('Synchronize', 'The owning UI’s tree supplies changes for the next response.', 3)
      ],
      rule: 'Component state belongs to a UI/session lifecycle. Background work must enter through UI.access rather than mutate an attached UI without its session lock.'
    },
    state: {
      title: 'Inside the state tree',
      kind: 'SERVER · JAVA',
      intro:
        'Each UI has a tree of StateNodes. The tree is both an identity map for incoming interactions and a change tracker for outgoing updates.',
      assembly:
        'UIInternals constructs and exposes StateTree. The tree maintains a root, ID-to-node map, ordered dirty-node set and before-client-response callbacks. Each node stores features and attachment state.',
      parts: [
        part(
          'Root & identity map',
          'Locate nodes in this UI',
          'StateTree holds rootNode, idToNode and nextId. Node IDs allow protocol messages to refer to the correct server node without serializing Java object identities.',
          'state',
          'private final Map<Integer, StateNode> idToNode'
        ),
        part(
          'StateNode & features',
          'Divide the state into small pieces',
          'StateNode stores parent/owner information, feature data, tracked feature changes and attachment flags. Node features are instantiated lazily through NodeFeatureRegistry.',
          'node',
          'public void markAsDirty()'
        ),
        part(
          'Dirty-node set',
          'Collect a stable set of changes',
          'collectChanges drains dirty nodes and updates their active state, which can dirty more nodes. It repeats until no new dirty nodes appear, then asks each collected node for its changes.',
          'state',
          'public void collectChanges('
        ),
        part(
          'Before-response work',
          'Finish changes before encoding',
          'UidlWriter runs beforeClientResponse callbacks before collecting changes. It can collect more rounds when serialization causes further state changes; this loop is bounded.',
          'encode',
          'private void encodeChanges('
        )
      ],
      flow: [
        step('Mutate', 'A feature change marks its owning node dirty.', 1),
        step('Collect', 'The tree gathers affected nodes, including lifecycle-related changes.', 2),
        step('Encode', 'NodeChanges become JSON through UidlWriter.', 3)
      ],
      rule: 'collectChanges is internal and consumes tracked changes. Its source explicitly warns that calling it outside UidlWriter can break client synchronization.'
    },
    writer: {
      title: 'Building a UIDL response',
      kind: 'SERVER · JAVA',
      intro:
        'UidlWriter turns accumulated UI state into a protocol response. It joins state changes, dependencies, metadata, constants and pending JavaScript into one update.',
      assembly:
        'The writer reads UIInternals and StateTree. A ConstantPool reduces repeated protocol data. NodeChange objects supply their JSON representation; pending JavaScript invocations are encoded separately.',
      parts: [
        part(
          'Response envelope',
          'Describe this synchronization',
          'createUidl prepares the response and metadata, runs pending access tasks and coordinates the remaining encoding work. Synchronization IDs support ordering between client and server.',
          'writer',
          'public ObjectNode createUidl('
        ),
        part(
          'Change encoder',
          'Serialize the dirty tree',
          'encodeChanges runs beforeClientResponse work and collects NodeChanges. New attachment-related dependencies are collected while changes are encoded. Up to five collection rounds accommodate additional dirty nodes.',
          'encode',
          'private void encodeChanges('
        ),
        part(
          'JavaScript & constants',
          'Include pending instructions',
          'The writer dumps pending JavaScript invocations from UIInternals and encodes them. It dumps new constant-pool values after this work, so constants referenced by the instructions are included.',
          'writer',
          '.dumpPendingJavaScriptInvocations()'
        ),
        part(
          'Client decoder',
          'Consume the same protocol',
          'MessageHandler imports constants before applying state changes. JavaScript execution is coordinated with reactive flushing so the DOM bindings can be ready for instructions.',
          'message',
          'protected handleJSON('
        )
      ],
      flow: [
        step('Settle UI work', 'Run pending access and before-response work.', 0),
        step('Encode changes', 'Collect and serialize dirty nodes and their dependencies.', 1),
        step('Finish the payload', 'Include JavaScript instructions and the constants they reference.', 2)
      ],
      rule: 'The response is a state update, not a freshly rendered HTML page. Normal request responses and push updates reuse this encoding machinery.'
    },
    bootstrap: {
      title: 'Starting a server-backed UI',
      kind: 'SERVER · JAVA',
      intro:
        'In the client-driven startup path, frontend JavaScript asks the server to create the UI. JavaScriptBootstrapHandler adapts the common bootstrap machinery to this initialization request.',
      assembly:
        'JavaScriptBootstrapHandler extends BootstrapHandler. Its JavaScriptBootstrapContext carries request, response, UI and session context, and resolves the initial navigation location.',
      parts: [
        part(
          'Initialization request',
          'Recognize the startup path',
          'canHandleRequest accepts INIT requests at the servlet root. This handler is specific to client-driven startup; other bootstrap options have related but different entry paths.',
          'bootstrap',
          'protected boolean canHandleRequest('
        ),
        part(
          'Bootstrap context',
          'Resolve the initial location',
          'initRoute reads location and query parameters sent by the client. For eager server loading it can use the request path and query parameters instead.',
          'bootstrap',
          'private static Location initRoute('
        ),
        part(
          'UI initialization',
          'Create the server-side root',
          'createAndInitUI delegates to the shared BootstrapHandler implementation and adds client-driven application parameters. The resulting UI has session and internal state needed for navigation and synchronization.',
          'bootstrap',
          'protected BootstrapContext createAndInitUI('
        ),
        part(
          'Router & Instantiator',
          'Create the initial view',
          'Route resolution chooses the target. Navigation uses the service’s Instantiator to obtain route components and layouts, allowing framework integrations to supply instances.',
          'instantiator',
          'default <T extends HasElement> T createRouteTarget('
        )
      ],
      flow: [
        step('Initialize', 'The frontend sends an INIT request with location information.', 0),
        step('Construct', 'Bootstrap machinery creates and initializes a UI for the session.', 2),
        step('Navigate', 'The router builds the initial view and its layout chain.', 3)
      ],
      rule: 'A UI is server-side state for a browser UI instance. It is not a singleton shared by all users, and the session may hold more than one UI.'
    },
    router: {
      title: 'Route resolution & instantiation',
      kind: 'SERVER · JAVA',
      intro:
        'Router translates a location into navigation state. Rendering then turns that state into a chain of view and layout instances attached to a UI.',
      assembly:
        'Router uses a route registry and a route resolver. A navigation event carries the UI, location and trigger. Navigation handlers coordinate the target, parameters and lifecycle.',
      parts: [
        part(
          'Router',
          'Resolve the destination',
          'navigate receives the UI, Location and NavigationTrigger. Routing separates the request to navigate from the work needed to render the selected target.',
          'router',
          'public int navigate(UI ui, Location location, NavigationTrigger trigger)'
        ),
        part(
          'Navigation renderer',
          'Build the view/layout chain',
          'AbstractNavigationStateRenderer coordinates before-leave and before-enter processing, route target instances and the final attachment into the UI.',
          'navigation',
          'Optional<Integer> result = handleBeforeLeaveEvents('
        ),
        part(
          'Instantiator',
          'Supply component instances',
          'The default createRouteTarget delegates to getOrCreate. The service’s selected implementation may integrate dependency injection; Flow’s navigation code does not need to hardcode Spring, CDI or Quarkus.',
          'instantiator',
          'default <T extends HasElement> T createRouteTarget('
        ),
        part(
          'UIInternals',
          'Keep UI navigation state',
          'UIInternals holds the UI’s current navigation-related state alongside its StateTree. Attaching the resulting route target leads to the same state synchronization used by ordinary component changes.',
          'internals',
          'public StateTree getStateTree()'
        )
      ],
      flow: [
        step('Resolve', 'Match the requested location to navigation state.', 0),
        step('Instantiate', 'Obtain target and layout instances through Instantiator.', 2),
        step('Attach', 'The navigation renderer installs the resulting chain in the UI.', 1)
      ],
      rule: 'Route matching and creating a view are separate responsibilities. A DI integration changes how instances are obtained without replacing the entire router.'
    },
    navigation: {
      title: 'The navigation lifecycle',
      kind: 'SERVER · JAVA',
      intro:
        'Navigation is a coordinated transition between component chains. It gives the old view a chance to leave and the destination a chance to validate or change the route before attachment.',
      assembly:
        'AbstractNavigationStateRenderer coordinates NavigationState, NavigationEvent, lifecycle observers, route target instances and router layouts. UIInternals holds the active UI-side result.',
      parts: [
        part(
          'BeforeLeave',
          'Consult the current view',
          'The renderer handles before-leave events before constructing the final destination. Observers can postpone navigation or change its outcome; a requested route is not a guarantee of attachment.',
          'navigation',
          'Optional<Integer> result = handleBeforeLeaveEvents('
        ),
        part(
          'Target creation',
          'Obtain destination instances',
          'Instantiator creates or supplies route targets. The renderer coordinates component instances and the layout chain, with reuse decisions depending on navigation state.',
          'instantiator',
          'default <T extends HasElement> T createRouteTarget('
        ),
        part(
          'BeforeEnter & attachment',
          'Resolve the final destination',
          'Before-enter processing can reroute or forward. When the transition proceeds, the renderer hands the target and layout chain to UIInternals for display.',
          'navigation',
          'ui.getInternals().showRouteTarget('
        ),
        part(
          'AfterNavigation',
          'Notify after the transition',
          'After the route has been displayed, after-navigation observers can react to the resulting location. Resulting component changes still go through the state tree.',
          'navigation',
          'fireAfterNavigationListeners('
        )
      ],
      flow: [
        step('Leave', 'Ask the current chain about leaving; it may postpone the transition.', 0),
        step('Enter', 'Resolve instances and run destination lifecycle checks.', 2),
        step('Notify', 'Display the target and run after-navigation listeners.', 3)
      ],
      rule: 'The familiar BeforeLeave → BeforeEnter → AfterNavigation order describes a successful transition. Postponement, forwarding, rerouting and errors introduce other paths.'
    },
    access: {
      title: 'Entering the UI from a background task',
      kind: 'SERVER · JAVA',
      intro:
        'UI.access schedules a command to run while its session is locked. This is the bridge from concurrent application work into Flow’s serialized UI state.',
      assembly:
        'UI wraps the supplied Command in an error-aware task and delegates to VaadinSession.access. Execution enters UI.accessSynchronously, checks attachment and establishes the current UI/session context.',
      parts: [
        part(
          'UI.access',
          'Submit UI work',
          'The public method returns a Future and wraps the command for session access. It may execute quickly or remain queued; callers should not assume it runs on a dedicated UI thread.',
          'ui',
          'public Future<Void> access('
        ),
        part(
          'Session queue',
          'Wait for exclusive access',
          'VaadinSession stores pending access tasks. Service/session machinery drains them when it can hold the session lock, serializing them with request-driven UI changes.',
          'session',
          'public void unlock()'
        ),
        part(
          'Execution context',
          'Set current UI and session',
          'UI.accessSynchronously acquires the lock, checks that the UI is still attached, sets current instances for the command and restores the previous context afterward.',
          'ui',
          'public void accessSynchronously(Command command)'
        ),
        part(
          'Outgoing changes',
          'Deliver the result',
          'Mutations made by the command dirty the ordinary StateTree. With automatic push enabled, session unlock coordinates sending updates; otherwise another response or explicit push is needed.',
          'push',
          'public void push('
        )
      ],
      flow: [
        step('Submit', 'Capture the UI and submit a command through access.', 0),
        step('Execute safely', 'Run under the session lock with the correct current instances.', 2),
        step('Deliver', 'Send state changes using the configured delivery mode.', 3)
      ],
      rule: 'The UI can detach between submission and execution. Handle that lifecycle; avoid long blocking work while holding the session lock, because it delays other UIs in the session too.'
    },
    session: {
      title: 'The session lock & access queue',
      kind: 'SERVER · JAVA',
      intro:
        'VaadinSession holds shared state for a user session, including its UIs and pending access tasks. Its lock protects that state across requests and background updates.',
      assembly:
        'The session combines a reentrant lock, UI registry and pending-access queue. VaadinService executes queued tasks; the outermost unlock coordinates pending work and automatic push.',
      parts: [
        part(
          'Reentrant lock',
          'Protect shared UI/session state',
          'Nested locking is supported. unlock checks the hold count: the final release is where it performs the work that must happen before exclusive access is relinquished.',
          'session',
          'public void unlock()'
        ),
        part(
          'Pending access tasks',
          'Serialize background commands',
          'Pending commands are executed with the lock held. This allows UI.access work and ordinary request handling to use the same component and state-tree structures safely.',
          'session',
          'getService().runPendingAccessTasks(this)'
        ),
        part(
          'UI context',
          'Scope execution to a UI',
          'UI.access establishes the current UI when running a command. The session lock alone does not imply a particular UI is current, because a session can contain multiple UIs.',
          'ui',
          'public Future<Void> access('
        ),
        part(
          'Automatic push',
          'Flush eligible UI updates',
          'On the outermost unlock, the session checks its UIs and triggers automatic push where configured. Further pending-task handling avoids leaving newly queued work stranded.',
          'session',
          'public void unlock()'
        )
      ],
      flow: [
        step('Acquire', 'A request or access task enters the protected session.', 0),
        step('Drain', 'Run pending commands while the lock is still held.', 1),
        step('Release', 'Coordinate automatic push and release the outermost lock.', 3)
      ],
      rule: 'The lock is per VaadinSession, not per component. Two browser UIs sharing a session also share this synchronization boundary.'
    },
    push: {
      title: 'Inside the push connection',
      kind: 'SERVER ↔ BROWSER',
      intro:
        'Push delivers a UI update without waiting for a new user interaction. AtmospherePushConnection manages the connection lifecycle and sends the same UIDL state updates the browser already knows how to apply.',
      assembly:
        'The connection associates a UI with an Atmosphere resource and connection state. Pending push states retain the need to send an update when a connection is not ready.',
      parts: [
        part(
          'Push entry point',
          'Request an asynchronous update',
          'The public push method delegates to push(true). Push is transport for UI state changes; it does not make component mutation safe without the session lock.',
          'push',
          'public void push('
        ),
        part(
          'Connection state',
          'Handle a connection that is not ready',
          'If disconnecting or not connected, the method records PUSH_PENDING or RESPONSE_PENDING. Once connected, it synchronizes access to the resource and rechecks connectivity before sending.',
          'push',
          'void push(boolean async)'
        ),
        part(
          'UIDL serialization',
          'Reuse the response format',
          'The connection sends a serialized update generated by UidlWriter. Dirty nodes, pending JavaScript and constants follow the same model as a normal UIDL response.',
          'writer',
          'public ObjectNode createUidl('
        ),
        part(
          'Browser receiver',
          'Apply the incoming update',
          'MessageHandler handles the payload and updates the client-side tree. DOM binding machinery reflects the changes on screen without a new page load.',
          'message',
          'protected handleJSON('
        )
      ],
      flow: [
        step('Trigger', 'Automatic session unlock or an explicit push requests delivery.', 0),
        step('Send or defer', 'The connection sends when ready or records pending work.', 1),
        step('Apply', 'The browser applies UIDL through its normal response machinery.', 3)
      ],
      rule: 'This journey assumes push is enabled and automatic. In manual mode your application chooses when to push; connection interruptions also affect when delivery happens.'
    },
    field: {
      title: 'Synchronizing a field property',
      kind: 'BROWSER → SERVER',
      intro:
        'A browser field’s value crosses the wire as a property synchronization message. The server updates its element property and then delivers change notifications used by higher-level field APIs.',
      assembly:
        'DOM bindings read configured properties. The RPC identifies a StateNode, feature and property. MapSyncRpcHandler decodes the value and updates ElementPropertyMap, subject to update permissions.',
      parts: [
        part(
          'Browser property capture',
          'Read the value at the event',
          'The binding’s event configuration lists properties to synchronize. handleDomEvent coordinates reading these properties with the event’s RPC payload.',
          'binding',
          'function handleDomEvent('
        ),
        part(
          'MapSyncRpcHandler',
          'Resolve and check the update',
          'The handler looks up the feature and property, considers enabled state and DisabledUpdateMode, and handles the property update. Disabled elements do not unconditionally accept client changes.',
          'sync',
          'protected Optional<Runnable> handleNode('
        ),
        part(
          'ElementPropertyMap update',
          'Decode and defer notification',
          'enqueuePropertyUpdate decodes the JSON value, tries conversions and requests deferredUpdateFromClient. A denied property change is surfaced as an error rather than silently accepted.',
          'sync',
          'private Optional<Runnable> enqueuePropertyUpdate('
        ),
        part(
          'RPC ordering',
          'Notify before ordinary event RPCs',
          'ServerRpcHandler processes synchronization invocations first, collects deferred callbacks and runs them before other invocations. This lets an event listener observe the updated value.',
          'rpc',
          'private void handleInvocations('
        )
      ],
      flow: [
        step('Capture', 'Read the property configured for synchronization.', 0),
        step('Update', 'Decode and apply the permitted property change.', 2),
        step('Notify', 'Run deferred change notifications before ordinary event handling.', 3)
      ],
      rule: 'Property synchronization and Binder validation are different layers. A field can receive a new value while a Binder conversion or validation still prevents writing it to the model.'
    },
    binder: {
      title: 'How a Binder binding is built',
      kind: 'SERVER · JAVA · FLOW-DATA',
      intro:
        'Binder connects field values to bean properties through a typed conversion and validation pipeline. A binding knows the field, how to read/write the model, and how to report errors.',
      assembly:
        'forField starts a BindingBuilder. Converters and validators form a chain; bind supplies the getter and setter and produces a BindingImpl. Binder holds the bindings and bean-level validators.',
      parts: [
        part(
          'BindingBuilder',
          'Assemble a typed pipeline',
          'A field starts with its presentation type. Converters can change that type before the final bind getter/setter contract. Validators added along the way run at their position in the chain.',
          'binder',
          'interface BindingBuilder<'
        ),
        part(
          'BindingImpl',
          'Connect field and model access',
          'The binding combines its HasValue field, conversion/validation machinery, model getter/setter and status handling. It manages value-change registration and field-level validation behavior.',
          'binder',
          'class BindingImpl<'
        ),
        part(
          'Field validation',
          'Check before writing the bean',
          'doWriteIfValid validates applied bindings first. Conversion or field-validation errors prevent the bean-writing phase. A field’s visible value therefore need not be a valid model value.',
          'binder',
          'private BinderValidationStatus<BEAN> doWriteIfValid('
        ),
        part(
          'Validation status',
          'Report results to the UI',
          'Binder builds a BinderValidationStatus from binding results and bean-level results, invokes the validation status handler and emits status-change notifications.',
          'binder',
          'BinderValidationStatus<BEAN> status = new BinderValidationStatus<>'
        )
      ],
      flow: [
        step('Configure', 'Create field bindings, conversion chains and model accessors.', 0),
        step('Convert & validate', 'Turn presentation values into checked model values.', 2),
        step('Report', 'Expose field and bean validation results to the application/UI.', 3)
      ],
      rule: 'This story uses buffered readBean/writeBeanIfValid. setBean uses a different, automatically updating binding mode. Binder itself does not persist a bean to a database.'
    },
    bean: {
      title: 'Writing a bean with Binder',
      kind: 'SERVER · JAVA · FLOW-DATA',
      intro:
        'The buffered write path checks all applied field bindings, writes converted values, and validates the resulting bean. The order matters for cross-field validation.',
      assembly:
        'doWriteIfValid makes a stable collection of applied bindings, accumulates validation results and snapshots old property values before invoking setters.',
      parts: [
        part(
          'Applied bindings',
          'Choose what participates',
          'The incoming bindings are copied and filtered with Binding.isApplied. Each participating binding is validated before any of these values are written.',
          'binder',
          'Collection<Binding<BEAN, ?>> currentBindings = bindings.stream()'
        ),
        part(
          'Old bean values',
          'Remember state before setters run',
          'getBeanState captures bound property values after field validation succeeds. Field validators are temporarily disabled during writing because they have already been checked.',
          'binder',
          'Map<Binding<BEAN, ?>, Object> oldValues = getBeanState('
        ),
        part(
          'Bean validators',
          'Check the combined result',
          'Converted values are written through the bindings. validateBean sees the updated bean, allowing rules that depend on multiple properties together.',
          'binder',
          'binderResults = validateBean(bean)'
        ),
        part(
          'Restore & report',
          'Handle a failed bean rule',
          'If bean validation fails, restoreBeanState restores captured property values. The method returns combined status and notifies status handlers; successful writes also update changed-binding tracking.',
          'binder',
          'restoreBeanState(bean, oldValues)'
        )
      ],
      flow: [
        step('Validate fields', 'Stop before writing if any applied field binding is invalid.', 0),
        step('Write & validate bean', 'Save old values, invoke setters, then evaluate bean rules.', 2),
        step('Keep or restore', 'Keep valid values; restore captured values on bean-validation failure.', 3)
      ],
      rule: 'This is not a database transaction: setter side effects are not undone by restoring property values. Java records also have a separate writeRecord API rather than this mutable-bean path.'
    },
    scanner: {
      title: 'Discovering frontend dependencies',
      kind: 'BUILD TIME · JAVA',
      intro:
        'Java annotations and class references tell the build which frontend modules, packages and theme resources the application needs. FrontendDependencies aggregates that information before assets are prepared.',
      assembly:
        'FrontendDependencies uses a ClassFinder and dependency scanning machinery. It tracks entry points, visited class information, package maps, asset maps and theme/PWA configuration.',
      parts: [
        part(
          'Entry points',
          'Start from application roots',
          'The scanner collects entry points such as route-related classes and the app shell. It visits reachable classes, so a dependency used by a component can contribute frontend requirements.',
          'scanner',
          'private final HashMap<String, EntryPointData> entryPoints'
        ),
        part(
          'Visited classes',
          'Avoid scanning indefinitely',
          'visitedClasses records ClassInfo. A filtering pattern excludes many platform and library classes; this is a specialized frontend dependency scan, not a complete Java call graph.',
          'scanner',
          'private final Map<String, ClassInfo> visitedClasses'
        ),
        part(
          'Packages & themes',
          'Combine declared requirements',
          'The constructor coordinates class visits, theme computation, package computation and PWA configuration. Feature flags and React settings can affect the results.',
          'scanner',
          'public FrontendDependencies(ClassFinder finder,'
        ),
        part(
          'Aggregated imports',
          'Feed generation tasks',
          'aggregateEntryPointInformation combines modules, scripts and CSS from reachable classes into entry-point data. Import-generation tasks use scanner output to construct the frontend entry.',
          'scanner',
          'private void aggregateEntryPointInformation()'
        )
      ],
      flow: [
        step('Declare', 'Application components specify modules, packages and themes.', 0),
        step('Scan', 'Visit entry points and reachable class metadata.', 1),
        step('Aggregate', 'Produce dependency information for import/package generation.', 3)
      ],
      rule: 'This discovery happens during preparation/build, not on every UI event. The optimized and broader scanner paths can collect different sets of dependencies.'
    },
    prepare: {
      title: 'The prepare-frontend goal',
      kind: 'BUILD TIME · MAVEN',
      intro:
        'The Maven goal is an entry point into shared frontend preparation. It turns project configuration and paths into the working frontend setup needed by later tasks.',
      assembly:
        'PrepareFrontendMojo extends the plugin’s common base and delegates to BuildFrontendUtil. Shared Options and NodeTasks keep much of the work outside the thin Maven entry point.',
      parts: [
        part(
          'PrepareFrontendMojo',
          'Expose the Maven goal',
          'executeInternal delegates preparation to BuildFrontendUtil.prepareFrontend(this). Plugin configuration supplies directories and frontend-tool settings.',
          'prepare',
          'BuildFrontendUtil.prepareFrontend(this)'
        ),
        part(
          'NodeTasks',
          'Compose preparation work',
          'NodeTasks receives Options and creates a sequence of FallibleCommands. Its builder checks options to decide which tasks participate instead of executing every possible task.',
          'tasks',
          'public class NodeTasks'
        ),
        part(
          'Dependency scan',
          'Discover application requirements',
          'The scanner supplies the package, module, theme and other dependency information that generation tasks need. This data connects Java application declarations to frontend tooling.',
          'scanner',
          'public FrontendDependencies(ClassFinder finder,'
        ),
        part(
          'Build continuation',
          'Hand off to build-frontend',
          'BuildFrontendMojo ensures build information exists, configures scanning, runs the node updater and decides whether a production bundle needs to be generated.',
          'build',
          'protected void executeInternal()'
        )
      ],
      flow: [
        step('Read configuration', 'The Maven goal exposes application paths and options.', 0),
        step('Prepare', 'Shared tooling prepares the frontend working setup.', 1),
        step('Continue', 'Later build work generates or reuses the browser bundle.', 3)
      ],
      rule: 'Preparation and production bundling are separate build responsibilities. The exact task set depends on options, existing files and whether a reusable bundle is available.'
    },
    tasks: {
      title: 'The frontend task pipeline',
      kind: 'BUILD TIME · JAVA + NODE',
      intro:
        'NodeTasks composes small build commands into an ordered pipeline. Options determine which files need updating, which packages need installing and which configuration needs generating.',
      assembly:
        'NodeTasks stores a List of FallibleCommand instances. Task implementations handle package metadata, dependency installation, imports, resource copying and Vite configuration.',
      parts: [
        part(
          'Options',
          'Decide which tasks exist',
          'The NodeTasks constructor reads Options and conditionally adds tasks. A preparation-only run and a bundle-generation run can therefore use different command sequences.',
          'tasks',
          'public class NodeTasks'
        ),
        part(
          'Ordered commands',
          'Execute dependent build work',
          'Commands run in order and can fail with an ExecutionFailedException. Ordering matters because generated configuration and imports depend on earlier discovery or updates.',
          'tasks',
          'public void execute()'
        ),
        part(
          'TaskUpdateImports',
          'Generate the frontend entry',
          'TaskUpdateImports specializes import generation using scanner output and options. Generated imports connect the discovered modules and application frontend resources to the bundler.',
          'imports',
          'public class TaskUpdateImports'
        ),
        part(
          'Maven coordinator',
          'Run the configured updater',
          'BuildFrontendMojo invokes BuildFrontendUtil.runNodeUpdater with its scanner. It then decides whether a frontend build is necessary.',
          'build',
          'BuildFrontendUtil.runNodeUpdater(this, frontendDependencies)'
        )
      ],
      flow: [
        step('Compose', 'Read Options and choose commands.', 0),
        step('Generate & install', 'Run the selected updates, imports and installation work in order.', 1),
        step('Bundle if needed', 'The build coordinator evaluates whether assets must be rebuilt.', 3)
      ],
      rule: 'A task pipeline is conditional, not a promise that every build installs packages or rebuilds the bundle. Existing project state and options affect the work performed.'
    },
    bundle: {
      title: 'From generated imports to browser assets',
      kind: 'BUILD TIME → BROWSER',
      intro:
        'The build produces the JavaScript and CSS the browser will load. Java classes remain on the server; frontend declarations determine which browser modules and resources need packaging.',
      assembly:
        'BuildFrontendMojo coordinates discovery and node updates, then checks generateBundle and BundleValidationUtil.needsBundleBuild. Shared build utilities invoke the frontend build when required.',
      parts: [
        part(
          'Dependency scanner',
          'Describe what the frontend needs',
          'The scanner combines entry-point metadata, packages, modules and themes. Generated import files make those requirements consumable by frontend tooling.',
          'scanner',
          'public FrontendDependencies(ClassFinder finder,'
        ),
        part(
          'Generated imports',
          'Create a frontend entry',
          'TaskUpdateImports produces imports from discovered frontend dependencies. These entries connect application modules and generated resources to the bundle.',
          'imports',
          'public class TaskUpdateImports'
        ),
        part(
          'Build/reuse decision',
          'Avoid unnecessary generation',
          'BuildFrontendMojo only invokes runFrontendBuild when bundle generation is enabled and bundle validation says a build is needed. A usable bundle can therefore be reused.',
          'build',
          'if (generateBundle() && BundleValidationUtil'
        ),
        part(
          'Runtime boundary',
          'Load code that speaks Flow',
          'The produced frontend includes browser-side Flow machinery and application dependencies. At runtime, MessageHandler processes UI state messages from server-side Java.',
          'message',
          'protected handleJSON('
        )
      ],
      flow: [
        step('Generate entries', 'Turn discovered frontend requirements into imports.', 1),
        step('Build or reuse', 'Validate existing assets and run the frontend build if needed.', 2),
        step('Load in browser', 'Serve the assets, then start the runtime UI protocol.', 3)
      ],
      rule: 'A frontend bundle and a UIDL response solve different problems. The bundle loads executable browser code; UIDL updates the live UI state after startup.'
    }
  };
  const common = {
    dom: 'dom',
    client: 'client',
    request: 'request',
    app: 'component',
    state: 'state',
    writer: 'writer'
  };
  const mappings = {
    click: common,
    startup: { ...common, request: 'bootstrap', app: 'router' },
    navigation: { ...common, request: 'router', app: 'navigation' },
    push: { ...common, request: 'access', app: 'session', writer: 'push' },
    binding: { ...common, request: 'field', app: 'binder', state: 'bean' },
    build: { dom: 'scanner', client: 'bundle', request: 'prepare', app: 'scanner', state: 'tasks', writer: 'bundle' }
  };
  window.FLOW_INTERNALS_CONTENT = { profiles, mappings };
})();
