'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const shared = require('../scripts/commands/shared');
const core = require('../scripts/core');
const { fakeTtyStreams, collectOutput } = require('./helpers');

const OPTIONS = [
  { value: 'codex', label: 'Codex' },
  { value: 'opencode', label: 'OpenCode' },
  { value: 'omp', label: 'Oh My Pi' },
];

async function settle(pending) {
  return Promise.race([
    pending.then((value) => ({ resolved: value })),
    new Promise((_, reject) => setTimeout(() => reject(new Error('selector did not settle')), 500)),
  ]);
}

test('single select moves with ↓ and confirms with Enter', async () => {
  const { input, output } = fakeTtyStreams();
  const chunks = collectOutput(output);
  const pending = shared.arrowSelect({ title: 'Pick', options: OPTIONS, input, output });
  input.write('\x1b[B');
  input.write('\r');
  const { resolved } = await settle(pending);
  assert.strictEqual(resolved, 'opencode');
  const plain = chunks.join('').replace(/\u001b\[[0-9;?]*[a-zA-Z]/g, '');
  assert.ok(plain.includes('Pick: (2/3)'));
  assert.ok(plain.includes('❯ OpenCode'));
  assert.strictEqual(input.rawMode, false, 'raw mode must be restored');
  assert.strictEqual(input.listenerCount('keypress'), 0, 'keypress listener must be removed');
});

test('single select wraps around in a single column', async () => {
  const { input, output } = fakeTtyStreams();
  const pending = shared.arrowSelect({ title: 'Pick', options: OPTIONS, input, output });
  input.write('\x1b[A'); // up from the first entry wraps to the last
  input.write('\r');
  const { resolved } = await settle(pending);
  assert.strictEqual(resolved, 'omp');
});

test('multi select toggles with Space and confirms the checked set', async () => {
  const { input, output } = fakeTtyStreams();
  const chunks = collectOutput(output);
  const pending = shared.arrowSelect({
    title: 'Agents',
    multi: true,
    initialSelected: ['codex', 'opencode', 'omp'],
    options: OPTIONS,
    input,
    output,
  });
  input.write('\x1b[B'); // highlight OpenCode
  input.write(' '); // untoggle OpenCode
  input.write('\r');
  const { resolved } = await settle(pending);
  assert.deepStrictEqual(resolved, ['codex', 'omp']);
  const plain = chunks.join('').replace(/\u001b\[[0-9;?]*[a-zA-Z]/g, '');
  assert.ok(plain.includes('[x] Codex'));
  assert.ok(plain.includes('[ ] OpenCode'), 'untoggled entry must render an empty box');
});

test('multi select confirms an empty set when nothing is checked', async () => {
  const { input, output } = fakeTtyStreams();
  const pending = shared.arrowSelect({ title: 'Agents', multi: true, options: OPTIONS, input, output });
  input.write('\r');
  const { resolved } = await settle(pending);
  assert.deepStrictEqual(resolved, []);
});

test('initialIndex moves the cursor without changing the pick', async () => {
  const { input, output } = fakeTtyStreams();
  const pending = shared.arrowSelect({
    title: 'Proceed?',
    initialIndex: 1,
    options: [{ value: true, label: 'Yes' }, { value: false, label: 'No' }],
    input,
    output,
  });
  input.write('\r'); // Enter on the pre-highlighted No
  const { resolved } = await settle(pending);
  assert.strictEqual(resolved, false);
});

test('Ctrl+C and Esc reject and restore the terminal', async () => {
  for (const key of ['\x03', '\x1b']) {
    const { input, output } = fakeTtyStreams();
    const chunks = collectOutput(output);
    const pending = shared.arrowSelect({ title: 'Pick', options: OPTIONS, input, output });
    input.write(key);
    await assert.rejects(pending, (exc) => exc instanceof core.PingCodeError);
    assert.ok(chunks.join('').includes('cancelled.'));
    assert.strictEqual(input.rawMode, false);
    assert.strictEqual(input.listenerCount('keypress'), 0);
  }
});

test('selector rejects empty options and non-interactive input', async () => {
  const { input, output } = fakeTtyStreams();
  await assert.rejects(
    shared.arrowSelect({ title: 'Pick', options: [], input, output }),
    core.PingCodeError,
  );
  const plainInput = fakeTtyStreams().input;
  delete plainInput.setRawMode;
  await assert.rejects(
    shared.arrowSelect({ title: 'Pick', options: OPTIONS, input: plainInput, output }),
    (exc) => exc instanceof core.PingCodeError && exc.message.includes('interactive terminal'),
  );
});

test('CJK labels never wrap: every emitted line fits the terminal', async () => {
  const { input, output } = fakeTtyStreams();
  const chunks = collectOutput(output);
  const pending = shared.arrowSelect({
    title: '选择',
    multi: true,
    options: [
      { value: 'a', label: '大数据服务工作组 (SHU)' },
      { value: 'b', label: '基础服务工作组 (PAAS)' },
      { value: 'c', label: '网运通项目组 (WYT)' },
    ],
    input,
    output,
  });
  input.write(' ');
  input.write('\r');
  await settle(pending);

  const stripAnsi = (line) => line.replace(/\u001b\[[0-9;?]*[a-zA-Z]/g, '');
  for (const line of chunks.join('').split('\n')) {
    const cells = shared.displayWidth(stripAnsi(line));
    assert.ok(cells <= 79, `line must fit 80 columns, occupies ${cells}: ${JSON.stringify(line)}`);
  }
});
