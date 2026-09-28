# Flow Atlas

A browser-based, interactive field guide to this Vaadin Flow checkout. Start with
an animated round trip, switch from concepts to classes, and follow any step into
its actual implementation.

Published at <https://vesanieminen.github.io/vaadin-visualizations/>.
The standalone distribution is maintained in
<https://github.com/vesanieminen/vaadin-visualizations>.

## Run and distribute

Open `index.html` directly in a browser, or serve this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs/flow-explorer
```

Then open <http://localhost:4173>. No npm installation, Maven build, backend,
external fonts, CDN, analytics, or network requests are required. GitHub links
are optional exits to the full repository. Copy this whole directory to any
static web host to distribute it. Hash links preserve the story, step and detail
level; module and concept links can also be shared. Local `file:` links only work
on the same machine, so use a hosted URL when sharing with others.

The distributable runtime consists of `index.html`, `styles.css`, `aura-colors.css`,
`atlas.css`, `internals.css`, `app.js`, `content.js`, `atlas.js`, `internals.js`,
`internals-content.js`, `world.css`, `world.js`, `world-scene.js`,
`world-content.js`, `world-details.css`, `world-details.js`,
`world-details-content.js`, `world-details-scene.js`, `world-details-models.js`,
`runtime-model.js`, `runtime-inspection.js`, `runtime-scene-learning.js`,
`runtime-lab.js`, `runtime-lab.css`,
`vendor/three-0.180.0.min.js`, `vendor/THREE-LICENSE.txt`,
`snapshot.js`, `README.md`, and `LICENSE`. The Python
generators are only needed when refreshing the bundled source snapshot.

## Colors

The guide uses Vaadin Aura’s default blue accent, cool neutral backgrounds and
semantic palette. `aura-colors.css` adapts Aura tokens with bundled fallbacks from
`@vaadin/aura` 25.3.0, so the guide also works without loading the component theme.
Navigation, surfaces, focus rings, diagram paths and syntax colors all use this
shared palette.

## What to explore

- Six step-by-step stories: clicks, bootstrap, navigation, background updates,
  buffered form binding, and frontend builds.
- The **3D runtime lab** at `#world`: the original spatial scene, with a guided
  four-stage journey. Concepts appear as execution reaches them. Persistence and
  build tooling appear when relevant.
- The **Detailed 3D lab** at `#world-details`: inspect fields, references, stack
  frames, messages and stored records. Both labs use the same deterministic
  application model, with nine experiments. **Inspect this step** and **Return to
  overview** carry the complete history, selected object and paused position.
- Play/pause, replay, previous/next step, direct step selection and playback speed.
- Selectable architecture nodes and concept/class labels.
- An **Inside** tab for every story node: interactive composition diagrams,
  execution steps, lifecycle rules, exact implementation excerpts and package
  locations. There are 19 shared explanations covering all 36 story nodes.
- A searchable module index, including declared internal Maven dependencies.
- A separate **Dependency atlas** with 2D and rotatable 3D views. The original
  card map remains available. Select a module, open its packages, and inspect
  import or Maven evidence on connections. Concept overlays locate related
  implementations across modules. Package selections also list repository-wide
  incoming and outgoing references, beyond the current map's scope.
- A concept field guide covering state, lifecycles, locking, data, DI and build time.
- Full offline source files, exact line references, in-file search and links pinned
  to the same Git commit.

Press `/` for global search. All controls are keyboard accessible. When focus is
on the page body, Space toggles playback and the arrow keys step through a story.
Playback starts only on request, pauses when the page is hidden or source/search
is opened, and respects reduced-motion preferences for animations. On narrow
screens, the diagram scrolls horizontally while the explanation stacks below it.

In the dependency atlas, select boxes or arrows to inspect them. Drag empty space
to pan in 2D or orbit in 3D. Use the zoom controls, Ctrl + scroll, or `+`/`-` while
the map is focused. Arrow keys move the camera and `R` resets it. The tilt slider
provides a keyboard-accessible alternative to dragging. Positions group modules
by responsibility; 3D block height represents source-file count, not importance
or execution order. Hash links preserve module/package selections, concept
overlays, connection filters and 2D/3D mode. Camera adjustments are local.

Choose **Inside** on a story node, then select a part to inspect its construction
and source. Execution cards link to the part that implements each phase. Returning
to the story restores the selected node, step, lens and tab. Anatomy links can be
shared directly, and the global search includes internals and package names.

## Teaching model, not runtime instrumentation

Both runtime labs use locally bundled Three.js and OrbitControls. They render with
WebGL when available and automatically use a software 3D renderer otherwise,
including in the in-app browser. Both paths use the same perspective camera,
geometry, object picking and simulation. The software path projects the monitor's
live canvas onto its 3D surface and uses simpler shading at a capped frame rate.
Both paths work offline. If graphics initialization fails completely, the
simulation controls and object explanations remain usable. Three.js
is MIT-licensed; its license and reproducible bundling instructions are in
`vendor/`. No third-party service receives data from the visualization.

Drag the 3D scene to orbit, scroll/pinch to zoom, or use camera presets.
In either lab, double-click a shape or its label to focus it. The inspector's
**Open in 3D** button and Enter on the scene provide keyboard alternatives. Close-ups
show the object and its contents, with surrounding context faded. Use
**Whole system** to restore the overview. Focus is preserved in shared links.

Both labs keep the scene, playback, explanation and timeline together. The
inspector is collapsible. The overview introduces interaction, request, Java
changes and browser update as four expandable stages. The detailed scene reveals
text and internals as you approach objects. Double-click an object (or press Enter
on the focused canvas) to open it. Parent boundaries and neighbours remain faintly
visible; breadcrumbs lead back out. Click a detailed card or stack slab to inspect
that specific part. Fields, children and incoming references are also selectable
in the flat inspector. Source and package links remain available offline.

**Operate the application** opens a readable interactive application panel:

- Repeated counter clicks accumulate, including clicks queued during another
  operation. The live strip shows Java, server text, client state and DOM values
  independently. **Trace the label** highlights their correspondence.
- Profile inputs accept edits. An empty name fails buffered validation. A valid
  name updates the bean; **Save accepted bean to database** explicitly writes
  application data. The live strip compares the draft, bean and stored value.
- Orders loads example records through a DataProvider and repository. Edit order
  #1001 and save it; a negative total is rejected without changing storage.
- Open a second simulated browser tab to operate an independent UI in the same
  session. **Hold session lock** prevents queued work from entering the mutation
  boundary. Release it and continue playback. **Network latency** changes how
  long requests and responses remain in flight.
- Background work enters an illustrated worker stack, submits UI.access, acquires
  the session lock and pushes changes. Heap identities survive returned frames.

The inspector offers **Structure**, **Changes** (before/after values, cause and
next step), and **Messages** (illustrative RPC, UIDL and repository payloads).
Thread frames expose local references to the relevant UI and heap objects.
Yellow links trace related representations; thin muted lines are references;
orange RPC/query arrows and blue UIDL arrows distinguish transport from green
Java execution. Changes highlight the affected cards.

Previous/next and **Execution history** restore entire immutable snapshots,
including both tabs, queues, locks, frames, messages and persisted example data.
Editing or submitting from an earlier snapshot branches the history. Share links
encode the action log, cursor and selection, including entered example values.
Reloading a shared link restores it without autoplay. Reset lab starts a fresh
application. In both views, canvas arrow keys orbit, `+`/`-` zoom, and `R`/Home
resets the camera. Experiments & camera contains presets, layer separation and
Ride the packet. Manual camera movement cancels the ride.
Playback pauses on source/search dialogs and when the page is hidden. Reduced
motion disables camera interpolation and packet travel. Resources and listeners
are disposed when leaving either lab.

This is an executable teaching model, not a running Vaadin backend, traffic
capture or JVM debugger. Identities, frames, schema and messages are illustrative;
wire payloads are simplified and the queue processes work sequentially rather
than emulating a servlet scheduler. Nested frames show logical object ownership,
not JVM allocation regions or physical memory sizes. The example retains
per-tab application values when navigating and models reconnecting to the same
UI. Push assumes automatic push. The optional database belongs to the application;
Flow does not automatically persist components or Binder beans. Build tooling
represents a separate phase before deployment. Reading intervals are added to
simulated network delays. Full retry, security and deployment behaviour remains
in the linked source contracts.

Repository relationships are extracted from declared direct `com.vaadin`
dependencies, aggregated into top-level families. The original card map includes
test scopes; the dependency atlas excludes them until **Include test scope** is
enabled.
Module discovery follows the reactor's declared modules and profile modules.
Dependency management, inherited dependencies and dependencies declared inside
profiles are not resolved. Consequently this is a navigation aid, not a full
Maven dependency graph. Source counts include tracked `.java`, `.ts` and `.js`
files beneath each family's `src/main` paths.

`build_atlas.py` additionally extracts Java packages and JavaScript/TypeScript
source folders from the same commit, plus explicit Java imports and relative
static ESM imports/exports. It resolves internal targets, skips ambiguous Java
targets, aggregates package-to-package edges, and retains up to three source
examples per package pair. It is an import index, not a Java compiler or call
graph: same-package references, fully qualified usages, reflection, dynamic
imports, bare npm imports and runtime protocol relationships are not inferred.
Package graphs show connections within the displayed scope; the inspector's
repository-wide lists include references crossing that scope. Maven and source
import connections are intentionally separate views.

## Refresh the snapshot

From a Git checkout of [Vaadin Flow](https://github.com/vaadin/flow), with this
directory at `docs/flow-explorer` (the standalone distribution does not contain
the Java source repository):

```sh
python3 docs/flow-explorer/build_snapshot.py
```

The generator reads **HEAD**, not uncommitted working-tree changes, and records
the commit, version, source files, exact method locations and module metadata in
`snapshot.js`. It fails if a referenced source or method marker disappears, so a
renamed implementation cannot silently produce an unrelated citation. Review
`content.js` and `internals-content.js` against the new source when upgrading:
explanatory prose and concept locations are curated,
not generated automatically. Commit dates in the UI describe the source commit,
not the date the guide was opened.

JavaScript syntax can be checked without installing dependencies:

```sh
node --check docs/flow-explorer/app.js
node --check docs/flow-explorer/content.js
node --check docs/flow-explorer/atlas.js
node --check docs/flow-explorer/internals.js
node --check docs/flow-explorer/internals-content.js
node --check docs/flow-explorer/world.js
node --check docs/flow-explorer/world-scene.js
node --check docs/flow-explorer/world-details.js
node --check docs/flow-explorer/world-details-scene.js
node --check docs/flow-explorer/world-details-models.js
node --check docs/flow-explorer/world-details-content.js
node --check docs/flow-explorer/world-content.js
node --check docs/flow-explorer/runtime-lab.js
node --check docs/flow-explorer/runtime-model.js
node --check docs/flow-explorer/runtime-inspection.js
node --check docs/flow-explorer/runtime-scene-learning.js
node --test docs/flow-explorer/tests/*.test.cjs
```

Bundled Flow sources retain their Apache 2.0 notices. See `LICENSE`.
