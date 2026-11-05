'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert');

const richText = require('../scripts/rich_text');

test('markdown headings, lists, and inline styles convert to rich-text HTML', () => {
  const html = richText.convertRichText('# 标题\n\n- 第一项\n- 第二项\n  - 嵌套\n\n**加粗** 与 `代码`');
  assert.strictEqual(
    html,
    '<h1>标题</h1><ul><li>第一项</li><li>第二项</li><ul><li>嵌套</li></ul></ul><p><strong>加粗</strong> 与 <code>代码</code></p>',
  );
});

test('plain text wraps in a single paragraph', () => {
  assert.strictEqual(richText.convertRichText('一行文字'), '<p>一行文字</p>');
});

test('text format escapes and splits paragraphs without markdown rules', () => {
  assert.strictEqual(
    richText.convertRichText('第一段\n\n**不解析**', 'text'),
    '<p>第一段</p><p>**不解析**</p>',
  );
});

test('already-HTML input passes through untouched in auto mode', () => {
  const value = '<p>已是<b>HTML</b></p>';
  assert.strictEqual(richText.convertRichText(value), value);
});

test('links and images convert with attributes preserved', () => {
  assert.strictEqual(
    richText.convertRichText('[文档](https://x.dev/a?b=1)'),
    '<p><a href="https://x.dev/a?b=1">文档</a></p>',
  );
  assert.strictEqual(
    richText.convertRichText('![截图](https://x.dev/a.png)'),
    '<p><img src="https://x.dev/a.png" alt="截图"></p>',
  );
});

test('fenced code blocks escape HTML-special content', () => {
  assert.strictEqual(
    richText.convertRichText('```js\nconst a = "<b>";\n```'),
    '<pre><code class="language-js">const a = &quot;&lt;b&gt;&quot;;</code></pre>',
  );
});

test('pipe tables convert to a table element', () => {
  assert.strictEqual(
    richText.convertRichText('| A | B |\n| --- | --- |\n| 1 | 2 |'),
    '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
  );
});

test('ordered lists render as ol elements', () => {
  assert.strictEqual(
    richText.convertRichText('1. 甲\n2. 乙'),
    '<ol><li>甲</li><li>乙</li></ol>',
  );
});

test('html format is verbatim even for markdown-looking text', () => {
  assert.strictEqual(richText.convertRichText('# not converted', 'html'), '# not converted');
});

test('markdown format forces conversion of html-looking input', () => {
  assert.strictEqual(richText.convertRichText('<p>x</p>', 'markdown'), '<p>&lt;p&gt;x&lt;/p&gt;</p>');
});

test('invalid format throws naming the flag', () => {
  assert.throws(
    () => richText.convertRichText('x', 'bogus', { flag: '--description-format' }),
    /--description-format/,
  );
});

// ── resolveRichTextInput ─────────────────────────────────────────────

test('resolveRichTextInput returns inline text as-is, null when absent', () => {
  assert.strictEqual(richText.resolveRichTextInput({ inline: '第一行\n第二行' }), '第一行\n第二行');
  assert.strictEqual(richText.resolveRichTextInput({}), null);
  assert.strictEqual(richText.resolveRichTextInput({ inline: null, file: null }), null);
});

test('resolveRichTextInput reads file content verbatim', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-rt-'));
  const file = path.join(dir, 'desc.md');
  const content = '# 标题\n\n- 第一项\n- 第二项\n\n> 引用';
  fs.writeFileSync(file, content, 'utf8');
  try {
    assert.strictEqual(richText.resolveRichTextInput({ file }), content);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveRichTextInput rejects inline and file together', () => {
  assert.throws(
    () => richText.resolveRichTextInput({ inline: 'a', file: 'b.md' }),
    /--description and --description-file are mutually exclusive/,
  );
  assert.throws(
    () => richText.resolveRichTextInput({ inline: 'a', file: 'b.md', inlineFlag: '--content', fileFlag: '--content-file' }),
    /--content and --content-file are mutually exclusive/,
  );
});

test('resolveRichTextInput reports unreadable files naming the flag', () => {
  assert.throws(
    () => richText.resolveRichTextInput({ file: '/nonexistent/no-such-desc.md' }),
    /--description-file: cannot read \/nonexistent\/no-such-desc\.md/,
  );
});

test('resolveRichTextInput reads stdin for "-"', async () => {
  const modulePath = JSON.stringify(path.join(__dirname, '..', 'scripts', 'rich_text.js'));
  const script = `const rt = require(${modulePath}); process.stdout.write(rt.resolveRichTextInput({ file: '-' }));`;
  const output = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', script], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`child exited ${code}`))));
    child.stdin.end('stdin 第一行\nstdin 第二行');
  });
  assert.strictEqual(output, 'stdin 第一行\nstdin 第二行');
});

test('resolveRichTextInput strips BOM and one leading comment header from files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-rt-'));
  const file = path.join(dir, 'desc.md');
  const header = [
    '<!--',
    'PingCode 推送临时文件：本文件经 --description-file 传给 CLI，',
    '本注释块在发送前被剥离，不会进入卡片描述。',
    '-->',
    '',
  ].join('\n');
  const body = '# 标题\n\n- 第一项';
  fs.writeFileSync(file, `\uFEFF${header}\n${body}`, 'utf8');
  try {
    assert.strictEqual(richText.resolveRichTextInput({ file }), body);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveRichTextInput keeps files without a header verbatim', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-rt-'));
  const file = path.join(dir, 'desc.md');
  const content = '### 正文\n无注释头';
  fs.writeFileSync(file, content, 'utf8');
  try {
    assert.strictEqual(richText.resolveRichTextInput({ file }), content);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveRichTextInput does not strip comment-like text from inline input', () => {
  const inline = '<!-- 不是头注释 -->\n正文';
  assert.strictEqual(richText.resolveRichTextInput({ inline }), inline);
});
