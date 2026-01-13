/**
 * Markdown Live Studio Engine
 * Custom Tokenizer, Synchronized Dual Scroll & Telemetry
 */

(function () {
  "use strict";

  const STORAGE_KEY = "markdown_studio_content_v1";

  const SAMPLE_DOCUMENT = `# Architectural Blueprint: Distributed Systems & Telemetry

Welcome to **Markdown Live Studio**, an in-browser markdown editor engineered with an AST tokenizer and live synchronized preview.

---

## 1. Core Engineering Pillars

> "Any organization that designs a system will produce a design whose structure is a copy of the organization's communication structure."  
> — *Conway's Law*

Key operational criteria:
- **Low Latency**: Sub-10ms response times at p99.
- **Fault Tolerance**: Automatic fallback mechanisms.
- **Zero AI Slop**: Genuine state machines and verified APIs.

### Implementation Checklist
- [x] Architect resilient data pipeline
- [x] Configure sliding-window rate limiting
- [ ] Implement multi-region PostgreSQL read replicas
- [ ] Benchmark WebSocket throughput

---

## 2. Benchmark Evaluation Matrix

| Metric Name | Baseline (v1.0) | Optimized (v2.4) | Improvement |
| :--- | :--- | :--- | :--- |
| **API Latency (p99)** | 142ms | 9.4ms | \`+1,410%\` |
| **Memory Footprint** | 512MB | 48MB | \`-90.6%\` |
| **Throughput (req/s)** | 2,400 | 28,000 | \`+1,066%\` |

---

## 3. Code Implementation

Here is an example of an asynchronous rate-limiter in JavaScript:

\`\`\`javascript
async function acquireToken(bucketKey, cost = 1) {
  const now = Date.now();
  const tokens = await redis.get(\`bucket:\${bucketKey}\`);
  
  if (tokens >= cost) {
    await redis.decrby(\`bucket:\${bucketKey}\`, cost);
    return { allowed: true, remaining: tokens - cost };
  }
  
  return { allowed: false, retryAfterMs: 500 };
}
\`\`\`

Explore links: [Open-Meteo Weather API](https://open-meteo.com) or review [GitHub Flavored Markdown](https://github.github.com/gfm/).
`;

  // DOM Elements
  const editor = document.getElementById("markdownEditor");
  const preview = document.getElementById("previewContainer");
  const wordCountEl = document.getElementById("wordCount");
  const charCountEl = document.getElementById("charCount");
  const lineCountEl = document.getElementById("lineCount");
  const readTimeEl = document.getElementById("readTime");
  const autoSaveIndicator = document.getElementById("autoSaveIndicator");
  const toastEl = document.getElementById("toast");

  const formatBoldBtn = document.getElementById("formatBold");
  const formatItalicBtn = document.getElementById("formatItalic");
  const formatHeadingBtn = document.getElementById("formatHeading");
  const formatQuoteBtn = document.getElementById("formatQuote");
  const formatCodeBtn = document.getElementById("formatCode");
  const formatLinkBtn = document.getElementById("formatLink");
  const formatTableBtn = document.getElementById("formatTable");

  const clearEditorBtn = document.getElementById("clearEditorBtn");
  const copyHtmlBtn = document.getElementById("copyHtmlBtn");
  const exportMdBtn = document.getElementById("exportMdBtn");
  const exportHtmlBtn = document.getElementById("exportHtmlBtn");

  // ==========================================
  // CUSTOM MARKDOWN AST / REGEX PARSER
  // ==========================================

  function parseMarkdown(md) {
    if (!md) return "";

    // Escape raw HTML entities to prevent XSS
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code Blocks: ```lang ... ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (match, lang, code) {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Tables
    html = parseTables(html);

    // Blockquotes: > quote
    html = html.replace(/^>\s?(.*)$/gim, "<blockquote>$1</blockquote>");
    // Combine consecutive blockquotes
    html = html.replace(/<\/blockquote>\s?<blockquote>/g, "<br>");

    // Headings (# to ######)
    html = html.replace(/^######\s?(.*)$/gim, "<h6>$1</h6>");
    html = html.replace(/^#####\s?(.*)$/gim, "<h5>$1</h5>");
    html = html.replace(/^####\s?(.*)$/gim, "<h4>$1</h4>");
    html = html.replace(/^###\s?(.*)$/gim, "<h3>$1</h3>");
    html = html.replace(/^##\s?(.*)$/gim, "<h2>$1</h2>");
    html = html.replace(/^#\s?(.*)$/gim, "<h1>$1</h1>");

    // Horizontal Rules
    html = html.replace(/^(?:---|\*\*\*|___)\s*$/gim, "<hr>");

    // Task Lists: - [ ] or - [x]
    html = html.replace(/^[-*]\s+\[ \]\s+(.*)$/gim, '<li class="task-item"><input type="checkbox" class="task-checkbox" disabled> $1</li>');
    html = html.replace(/^[-*]\s+\[x\]\s+(.*)$/gim, '<li class="task-item"><input type="checkbox" class="task-checkbox" checked disabled> <del>$1</del></li>');

    // Unordered Lists: - or *
    html = html.replace(/^[-*]\s+(.*)$/gim, "<li>$1</li>");

    // Ordered Lists: 1.
    html = html.replace(/^\d+\.\s+(.*)$/gim, "<li>$1</li>");

    // Wrap list items in <ul>
    html = html.replace(/(<li.*<\/li>)/gis, function (match) {
      return `<ul>${match}</ul>`;
    });
    // Clean nested duplicate uls
    html = html.replace(/<\/ul>\s?<ul>/g, "");

    // Inline formatting
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

    // Strikethrough: ~~text~~
    html = html.replace(/~~(.*?)~~/g, "<del>$1</del>");

    // Italic: *text* or _text_
    html = html.replace(/\*([^\*]+)\*/g, "<em>$1</em>");
    html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

    // Inline Code: `code`
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Images: ![alt](url)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraphs: Wrap non-tagged lines in <p>
    const lines = html.split("\n");
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      const isBlockTag = /^(<h[1-6]|<pre|<blockquote|<ul|<ol|<table|<hr|<div)/i.test(trimmed);
      if (!isBlockTag && !line.startsWith("</")) {
        return `<p>${line}</p>`;
      }
      return line;
    });

    return formattedLines.join("\n");
  }

  function parseTables(text) {
    const tableRegex = /\|(.+)\|[\r\n]+\|([-: |]+)\|[\r\n]+((?:\|.*\|[\r\n]*)+)/g;
    return text.replace(tableRegex, function (match, headerLine, alignLine, bodyLines) {
      const headers = headerLine.split("|").map(h => h.trim()).filter(h => h.length > 0);
      const rows = bodyLines.trim().split("\n").map(row => {
        return row.split("|").map(cell => cell.trim()).filter(cell => cell.length > 0);
      });

      let tableHtml = "<table><thead><tr>";
      headers.forEach(h => {
        tableHtml += `<th>${h}</th>`;
      });
      tableHtml += "</tr></thead><tbody>";

      rows.forEach(r => {
        tableHtml += "<tr>";
        r.forEach(c => {
          tableHtml += `<td>${c}</td>`;
        });
        tableHtml += "</tr>";
      });

      tableHtml += "</tbody></table>";
      return tableHtml;
    });
  }

  // ==========================================
  // TELEMETRY & SYNC
  // ==========================================

  function updateTelemetry(text) {
    const chars = text.length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const lines = text === "" ? 0 : text.split("\n").length;
    const readMinutes = Math.ceil(words / 200);

    charCountEl.textContent = chars.toLocaleString();
    wordCountEl.textContent = words.toLocaleString();
    lineCountEl.textContent = lines.toLocaleString();
    readTimeEl.textContent = `~${readMinutes} min read`;
  }

  function render() {
    const raw = editor.value;
    const parsed = parseMarkdown(raw);
    preview.innerHTML = parsed;
    updateTelemetry(raw);

    // Save state
    try {
      localStorage.setItem(STORAGE_KEY, raw);
      autoSaveIndicator.textContent = "Auto-saved to LocalStorage";
      autoSaveIndicator.style.color = "#10b981";
    } catch (e) {
      autoSaveIndicator.textContent = "Storage full";
      autoSaveIndicator.style.color = "var(--accent-red)";
    }
  }

  // Dual Scroll Synchronization
  let isEditorScrolling = false;
  let isPreviewScrolling = false;

  editor.addEventListener("scroll", () => {
    if (isPreviewScrolling) return;
    isEditorScrolling = true;
    const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    setTimeout(() => { isEditorScrolling = false; }, 50);
  });

  preview.addEventListener("scroll", () => {
    if (isEditorScrolling) return;
    isPreviewScrolling = true;
    const percentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
    editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
    setTimeout(() => { isPreviewScrolling = false; }, 50);
  });

  // ==========================================
  // TOOLBAR FORMATTING
  // ==========================================

  function wrapSelection(before, after = before, defaultText = "text") {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const selected = text.substring(start, end) || defaultText;

    const replacement = before + selected + after;
    editor.value = text.substring(0, start) + replacement + text.substring(end);
    editor.focus();
    editor.setSelectionRange(start + before.length, start + before.length + selected.length);
    render();
  }

  function insertLinePrefix(prefix) {
    const start = editor.selectionStart;
    const text = editor.value;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;

    editor.value = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    editor.focus();
    render();
  }

  // ==========================================
  // EXPORT FUNCTIONS
  // ==========================================

  function copyHtml() {
    const html = preview.innerHTML;
    navigator.clipboard.writeText(html).then(() => {
      showToast("HTML copied to clipboard!");
    }).catch(() => {
      showToast("Could not access clipboard.");
    });
  }

  function exportMarkdown() {
    const content = editor.value;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, `document-${Date.now()}.md`);
    showToast("Markdown file downloaded");
  }

  function exportHtml() {
    const bodyContent = preview.innerHTML;
    const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Exported Document</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.7; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { background: #f1f5f9; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    blockquote { border-left: 2px solid #94a3b8; margin: 16px 0; padding: 8px 16px; background: #f8fafc; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;

    const blob = new Blob([standaloneHtml], { type: "text/html;charset=utf-8" });
    downloadBlob(blob, `document-${Date.now()}.html`);
    showToast("Standalone HTML file downloaded");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2500);
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  function init() {
    // Load persisted content or initial sample document
    const saved = localStorage.getItem(STORAGE_KEY);
    editor.value = saved !== null ? saved : SAMPLE_DOCUMENT;

    // Real-time render on typing
    editor.addEventListener("input", render);

    // Toolbar actions
    formatBoldBtn.addEventListener("click", () => wrapSelection("**", "**", "bold text"));
    formatItalicBtn.addEventListener("click", () => wrapSelection("*", "*", "italic text"));
    formatHeadingBtn.addEventListener("click", () => insertLinePrefix("## "));
    formatQuoteBtn.addEventListener("click", () => insertLinePrefix("> "));
    formatCodeBtn.addEventListener("click", () => wrapSelection("```javascript\n", "\n```", "console.log('code');"));
    formatLinkBtn.addEventListener("click", () => wrapSelection("[", "](https://example.com)", "link title"));
    formatTableBtn.addEventListener("click", () => {
      const tableSample = "\n| Column 1 | Column 2 |\n|---|---|\n| Cell 1 | Cell 2 |\n";
      wrapSelection(tableSample, "", "");
    });

    clearEditorBtn.addEventListener("click", () => {
      if (confirm("Clear editor content?")) {
        editor.value = "";
        render();
      }
    });

    copyHtmlBtn.addEventListener("click", copyHtml);
    exportMdBtn.addEventListener("click", exportMarkdown);
    exportHtmlBtn.addEventListener("click", exportHtml);

    // Keyboard shortcuts
    editor.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        wrapSelection("**", "**", "bold text");
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        wrapSelection("*", "*", "italic text");
      }
    });

    // Initial render
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
