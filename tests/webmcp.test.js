const { test } = require('node:test');
const assert = require('node:assert/strict');
const { register, createTools } = require('../webmcp');
const editor = { getState: () => ({ image: null }), setOutput: input => input, setCrop: input => input, prepareExport: input => input };

test('unsupported browsers skip registration without touching the editor', async () => {
  assert.equal(await register({}, editor), false);
});
test('registers four schema-defined tools, including a read-only state tool', async () => {
  const tools = [];
  const context = { async registerTool(tool) { tools.push(tool); } };
  assert.equal(await register({ modelContext: context }, editor), true);
  assert.equal(tools.length, 4);
  assert.equal(tools[0].annotations.readOnlyHint, true);
  assert.equal(tools[1].inputSchema.properties.ppi.type, 'integer');
  assert.deepEqual(await tools[0].execute({}), { ok: true, state: { image: null } });
});
test('registration errors abort partial registration and leave normal editing available', async () => {
  let signal; let count = 0;
  assert.equal(await register({ modelContext: { registerTool(tool, options) { signal = options.signal; if (++count === 2) throw new Error('Permission denied'); } } }, editor), false);
  assert.equal(count, 2);
  assert.equal(signal.aborted, true);
});
test('tool schemas enforce types, ranges, allowed keys and required arguments at runtime', async () => {
  const tools = createTools(editor);
  for (const args of [{ width: 630 }, { width: '630', height: 810 }, { width: 630, height: 810, ppi: 144.5 }, { width: 630, height: 810, url: 'https://example.com' }, { width: Infinity, height: 810 }, { width: 630, height: 810, unit: 'pt' }]) {
    assert.equal((await tools[1].execute(args)).error.code, 'invalid_arguments');
  }
  assert.equal((await tools[2].execute({})).ok, false);
  assert.equal((await tools[2].execute({ horizontal: 2 })).ok, false);
  assert.equal((await tools[3].execute({ format: 'gif' })).ok, false);
});
test('cancellation prevents any mutation', async () => {
  let called = false;
  const tools = createTools({ ...editor, setOutput() { called = true; } });
  const controller = new AbortController(); controller.abort();
  assert.equal((await tools[1].execute({ width: 630, height: 810 }, { signal: controller.signal })).error.code, 'cancelled');
  assert.equal(called, false);
});
