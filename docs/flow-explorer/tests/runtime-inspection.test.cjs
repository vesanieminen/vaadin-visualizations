/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RuntimeModel } = require('../runtime-model.js');
global.window = {};
require('../world-details-content.js');
require('../runtime-inspection.js');

test('stack locals link to the executing UI and every drill-down target resolves', () => {
  const model = new RuntimeModel();
  model.configure('second', true);
  model.dispatch('click', { tab: 2 });
  for (let i = 0; i < 5; i++) model.advance();
  const graph = window.FLOW_RUNTIME_INSPECTION.inspect(model.state);
  const uiReference = graph['threads/request-0'].fields.find((f) => f.name === 'ui');
  assert.deepEqual(uiReference, { name: 'ui', ref: 'ui', identity: 'UI@2', tab: 2 });
  assert.equal(graph['threads/request-1'].source, 'rpc');
  assert.equal(graph['threads/request-2'].fields.find((f) => f.name === 'next').value, 8);
  const second = window.FLOW_RUNTIME_INSPECTION.inspect(model.state, uiReference.tab);
  assert.equal(second.ui.identity, 'UI@2');
  assert.deepEqual(
    second.session.fields.filter((f) => f.ref).map((f) => [f.identity, f.tab]),
    [
      ['UI@1', 1],
      ['UI@2', 2]
    ]
  );
  assert.equal(second['component/view'].fields.find((f) => f.name === 'counter').value, 8);
  for (const item of Object.values(graph)) {
    for (const key of [
      ...item.children,
      ...item.fields.filter((f) => f.ref).map((f) => f.ref),
      ...(item.parent ? [item.parent] : [])
    ]) {
      assert.ok(graph[key], `${item.key} must link to an inspectable part: ${key}`);
    }
  }
});
