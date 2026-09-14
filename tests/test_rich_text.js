'use strict';

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
