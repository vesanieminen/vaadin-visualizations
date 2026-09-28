/* Copyright 2026 Vaadin Ltd. Licensed under the Apache License, Version 2.0. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RuntimeModel } = require('../runtime-model.js');
function finish(model) {
  let count = 0;
  while (model.canAdvance() && count++ < 120) model.advance();
  assert.ok(count < 120, 'simulation terminates');
}
test('counter mutations, message delivery, rewind and replay preserve independent representations', () => {
  const model = new RuntimeModel();
  model.dispatch('click');
  for (let i = 0; i < 5; i++) model.advance();
  assert.equal(model.state.tabs[0].server, 8);
  assert.equal(model.state.tabs[0].client, 7);
  assert.ok(model.state.stacks.request.some((f) => f.method.includes('ClickListener')));
  const atListener = model.cursor;
  finish(model);
  assert.equal(model.state.tabs[0].client, 8);
  assert.equal(model.state.stacks.request.length, 0);
  model.dispatch('click');
  finish(model);
  assert.equal(model.state.tabs[0].client, 9);
  const restored = RuntimeModel.restore(model.serialize());
  assert.deepEqual(restored.state, model.state);
  model.seek(atListener);
  assert.equal(model.state.tabs[0].client, 7);
  assert.equal(model.state.tabs[0].server, 8);
  assert.ok(model.state.messages.every((m) => m.type !== 'UIDL'));
  finish(model);
  assert.equal(model.state.tabs[0].client, 9);
});
test('two tabs queue behind a shared lock and keep independent counters', () => {
  const model = new RuntimeModel();
  model.configure('second', true);
  model.configure('hold', true);
  model.dispatch('click', { tab: 1 });
  model.dispatch('click', { tab: 2 });
  finish(model);
  assert.equal(model.state.phase.waiting, true);
  assert.deepEqual(
    model.state.tabs.map((t) => t.server),
    [7, 7]
  );
  assert.equal(model.state.pending.length, 1);
  model.configure('hold', false);
  finish(model);
  assert.deepEqual(
    model.state.tabs.map((t) => t.client),
    [8, 8]
  );
  assert.equal(model.state.lock.owner, null);
  assert.equal(model.state.pending.length, 0);
});
test('buffered validation and explicit persistence have separate observable effects', () => {
  const model = new RuntimeModel();
  model.edit('draft', '');
  model.dispatch('binding');
  finish(model);
  assert.equal(model.state.tabs[0].bean, 'Grace');
  assert.equal(model.state.tabs[0].validation, 'Name is required');
  model.edit('draft', 'Ada');
  model.dispatch('binding');
  finish(model);
  assert.equal(model.state.tabs[0].bean, 'Ada');
  assert.equal(model.state.database.profile, 'Grace');
  model.dispatch('persist');
  finish(model);
  assert.equal(model.state.database.profile, 'Ada');
  model.dispatch('data');
  finish(model);
  model.edit('orderTotal', 175);
  assert.equal(model.state.database.orders[0].total, 120);
  model.dispatch('persistOrders');
  finish(model);
  assert.equal(model.state.database.orders[0].total, 175);
});
test('branching after rewind discards future actions and serializes the new history', () => {
  const model = new RuntimeModel();
  model.dispatch('click');
  finish(model);
  const end = model.cursor;
  model.dispatch('click');
  finish(model);
  model.seek(end);
  model.edit('draft', '<Ada>');
  model.dispatch('binding');
  finish(model);
  assert.equal(model.state.tabs[0].server, 8);
  assert.equal(model.state.tabs[0].bean, '<Ada>');
  assert.deepEqual(RuntimeModel.restore(model.serialize()).state, model.state);
  assert.throws(() => RuntimeModel.restore({ commands: [['dispatch', 'unknown']] }));
});

test('background access updates only its UI and returns its frames after encoding', () => {
  const model = new RuntimeModel();
  model.configure('second', true);
  model.dispatch('push', { tab: 2 });
  model.advance();
  model.advance();
  model.advance();
  assert.equal(model.state.lock.owner, 'access-1');
  assert.equal(model.state.stacks.request.length, 0);
  assert.equal(model.state.stacks.worker[0].locals.ui, 'UI@2');
  assert.deepEqual(
    model.state.tabs.map((t) => t.server),
    [7, 8]
  );
  assert.deepEqual(
    model.state.tabs.map((t) => t.client),
    [7, 7]
  );
  finish(model);
  assert.deepEqual(
    model.state.tabs.map((t) => t.client),
    [7, 8]
  );
  assert.equal(model.state.messages.at(-1).payload.changes[0].value, '8');
  assert.deepEqual(model.state.stacks, { request: [], worker: [] });
});

test('invalid order edits cannot reach persistence and navigation waits for delivery', () => {
  const model = new RuntimeModel();
  model.dispatch('navigation', { route: '/orders' });
  for (let i = 0; i < 5; i++) model.advance();
  assert.equal(model.state.tabs[0].route, '/orders');
  assert.equal(model.state.tabs[0].clientRoute, '/counter');
  finish(model);
  model.dispatch('data');
  finish(model);
  model.edit('orderTotal', -50);
  model.dispatch('persistOrders');
  finish(model);
  assert.equal(model.state.database.orders[0].total, 120);
  assert.equal(model.state.tabs[0].validation, 'Total must be zero or greater');
  assert.deepEqual(RuntimeModel.restore(model.serialize()).state, model.state);
});
