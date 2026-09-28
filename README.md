# Vaadin visualizations

[**Open Flow Atlas**](https://vesanieminen.github.io/vaadin-visualizations/)
· [**Enter the 3D runtime lab**](https://vesanieminen.github.io/vaadin-visualizations/#world)

An interactive guide to how Vaadin Flow works, from the browser and Java runtime
to packages and source code. It assumes ordinary Java and web development knowledge.

- Follow six animated journeys through clicks, startup, navigation, push, binding,
  and frontend builds.
- Operate a 3D simulation: click the application, follow packets, separate memory
  layers, hold the session lock, and add a second browser tab.
- Explore module dependencies, package relationships, concept internals, and
  commit-pinned source in an offline reader.
- Uses Vaadin Aura colors and works with WebGL or software 3D rendering.

## Run locally

Open `docs/flow-explorer/index.html` in a browser, or run:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs/flow-explorer
```

Then open <http://localhost:4173/>. No install or application server is needed.
Copy `docs/flow-explorer` to any static host for a standalone deployment.

## Publishing

Pushes to `main` automatically publish `docs/flow-explorer` using the
[Pages workflow](.github/workflows/pages.yml). GitHub Pages must use
**GitHub Actions** as its publishing source. The workflow can also be run manually.

## Sources and maintenance

The bundled source snapshot is from
[vaadin/flow at 7515b5a0ca90a8b2c94b62f2e8fb1328cad7dd4b](https://github.com/vaadin/flow/tree/7515b5a0ca90a8b2c94b62f2e8fb1328cad7dd4b).
This repository contains the standalone teaching tool; the simulations illustrate
code paths and logical ownership, rather than instrumenting a running Vaadin app.

See the [explorer guide](docs/flow-explorer/README.md) for controls, model boundaries,
and snapshot maintenance. Snapshot generators must run from `docs/flow-explorer`
inside a Vaadin Flow checkout. They do not require a build of Flow.

Flow source and the explorer use the [Apache 2.0 license](LICENSE).
The bundled Three.js renderer uses its [MIT license](docs/flow-explorer/vendor/THREE-LICENSE.txt).
