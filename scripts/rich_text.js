'use strict';

// PingCode stores work item descriptions, comments, and idea/ticket
// descriptions as rich-text HTML (e.g. `<p>text</p>`). This module converts
// CLI input (Markdown or plain text) into that format before it is sent.
//
// `convertRichText(value, format)`:
//   auto     (default) pass HTML through verbatim, otherwise convert Markdown
//   markdown convert Markdown to HTML
//   html     pass through verbatim, untouched
//   text     HTML-escape and wrap in <p> blocks, no Markdown interpretation

const core = require('./core');

const RICH_TEXT_FORMATS = ['auto', 'markdown', 'md', 'html', 'text'];

// Rich-text HTML emitted by PingCode starts with one of these tags.
const HTML_START_RE = /^\s*<(p|div|br|h[1-6]|ul|ol|li|table|thead|tbody|tr|blockquote|pre|hr|img|a|span|strong|em|b|i|u|code|del|s|section)\b/i;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function looksLikeHtml(text) {
  return HTML_START_RE.test(String(text));
}

// ── Inline Markdown ───────────────────────────────────────────────────

function convertInline(text) {
  let s = escapeHtml(text);

  // Protect inline code spans from the rules below.
  const codeSpans = [];
  s = s.replace(/`([^`\n]+)`/g, (_, code) => {
    codeSpans.push(`<code>${code}</code>`);
    return `\x00${codeSpans.length - 1}\x00`;
  });

  // Images before links so ![alt](src) is not eaten by [text](href).
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${escapeAttr(src)}" alt="${alt}">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${escapeAttr(href)}">${label}</a>`);

  s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<![\w])__([^_\n]+)__(?!__)/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/(?<![\w])_([^_\n]+)_(?!_)/g, '<em>$1</em>');
  s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

  s = s.replace(/\x00(\d+)\x00/g, (_, index) => codeSpans[Number(index)]);
  return s;
}

// ── Lists ─────────────────────────────────────────────────────────────

// items: [{ indent, ordered, text }] sharing the same base indent.
function renderList(items) {
  const baseIndent = items[0].indent;
  const ordered = items[0].ordered;
  const parts = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.indent > baseIndent) {
      const children = [];
      while (i < items.length && items[i].indent > baseIndent) {
        children.push(items[i]);
        i += 1;
      }
      parts.push(renderList(children));
    } else if (item.indent === baseIndent) {
      parts.push(`<li>${convertInline(item.text)}</li>`);
      i += 1;
    } else {
      break;
    }
  }
  return ordered ? `<ol>${parts.join('')}</ol>` : `<ul>${parts.join('')}</ul>`;
}

// ── Block Markdown ────────────────────────────────────────────────────

function splitTableRow(row) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function mdToHtml(markdown) {
  const source = String(markdown).replace(/\r\n?/g, '\n').trim();
  if (!source) return '';

  const lines = source.split('\n');
  const out = [];
  let paragraph = [];
  let i = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${paragraph.map(convertInline).join('\n')}</p>`);
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*(\S*)\s*$/);
    if (fence) {
      flushParagraph();
      const closeRe = new RegExp(`^\\s*\\${fence[1][0]}{3,}\\s*$`);
      const code = [];
      i += 1;
      while (i < lines.length && !closeRe.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // skip the closing fence (or EOF)
      const lang = fence[2] ? ` class="language-${escapeAttr(fence[2])}"` : '';
      out.push(`<pre><code${lang}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      flushParagraph();
      i += 1;
      continue;
    }

    // ATX heading
    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      out.push(`<h${level}>${convertInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flushParagraph();
      out.push('<hr>');
      i += 1;
      continue;
    }

    // Blockquote
    if (/^\s*>/.test(line)) {
      flushParagraph();
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${mdToHtml(quote.join('\n'))}</blockquote>`);
      continue;
    }

    // Pipe table (header row followed by a separator row)
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1])
    ) {
      flushParagraph();
      const headers = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const head = `<thead><tr>${headers.map((h) => `<th>${convertInline(h)}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${rows
        .map((row) => `<tr>${row.map((cell) => `<td>${convertInline(cell)}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;
      out.push(`<table>${head}${body}</table>`);
      continue;
    }

    // List item (collect the whole run, then render with nesting)
    const item = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flushParagraph();
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!m) break;
        items.push({
          indent: m[1].replace(/\t/g, '  ').length,
          ordered: /^\d/.test(m[2]),
          text: m[3],
        });
        i += 1;
      }
      out.push(renderList(items));
      continue;
    }

    paragraph.push(line);
    i += 1;
  }
  flushParagraph();

  return out.join('');
}

function textToHtml(text) {
  const source = String(text).replace(/\r\n?/g, '\n').trim();
  if (!source) return '';
  return source
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
}

function convertRichText(value, format = 'auto', { flag = '--format' } = {}) {
  const text = String(value ?? '');
  switch (format) {
    case undefined:
    case null:
    case 'auto':
      return looksLikeHtml(text) ? text : mdToHtml(text);
    case 'markdown':
    case 'md':
      return mdToHtml(text);
    case 'html':
      return text;
    case 'text':
      return textToHtml(text);
    default:
      throw new core.PingCodeError(
        `${flag} must be one of: auto, markdown, html, text`,
      );
  }
}

module.exports = {
  RICH_TEXT_FORMATS,
  convertRichText,
  convertInline,
  looksLikeHtml,
  mdToHtml,
  textToHtml,
};
