# Bundled 3D renderer

`three-0.180.0.min.js` contains the selected Three.js 0.180.0 exports and
OrbitControls and SVGRenderer, bundled as a classic script so it works with `file://` as well as
HTTP. Its MIT license is in `THREE-LICENSE.txt`. No CDN or network fetch occurs at
runtime. The application and geometry are in `../world*.js`.

To reproduce the bundle from npm (requires network for this development step):

```sh
mkdir -p /tmp/flow-world-build
npm install --prefix /tmp/flow-world-build --ignore-scripts --no-audit --no-fund three@0.180.0 esbuild@0.25.10
cp docs/flow-explorer/vendor/three-entry.js /tmp/flow-world-build/vendor-entry.js
/tmp/flow-world-build/node_modules/.bin/esbuild /tmp/flow-world-build/vendor-entry.js --bundle --minify --format=iife --target=es2020 --legal-comments=eof --outfile=docs/flow-explorer/vendor/three-0.180.0.min.js
cp /tmp/flow-world-build/node_modules/three/LICENSE docs/flow-explorer/vendor/THREE-LICENSE.txt
```

The entry file and these instructions are build-time inputs; distribution only
needs the bundled script and the license.
