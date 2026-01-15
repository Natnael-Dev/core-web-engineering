const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain",
};

// Project directory catalog
const PROJECTS = [
  // Newly Engineered Curriculum Projects
  {
    id: "01-Task-Master-Kanban",
    name: "01. TaskMaster Kanban Engine",
    category: "Tier 1: Vanilla JS & Browser Architecture",
    description: "Multi-lane productivity Kanban board featuring native HTML5 drag-and-drop, schema-versioned localStorage persistence, priority tags, and JSON export/import.",
    tags: ["HTML5 Drag & Drop", "localStorage", "ES6 Classes", "State Engine"],
    status: "Active",
    path: "/01-Task-Master-Kanban/index.html",
    badge: "New"
  },
  {
    id: "02-Weather-Pulse",
    name: "02. WeatherPulse Live Dashboard",
    category: "Tier 1: Vanilla JS & Browser Architecture",
    description: "Real-time meteorological station powered by the public Open-Meteo REST API. Features live GPS geolocation, 24-hr hourly breakdown, 7-day forecast, and offline caching.",
    tags: ["REST API", "Async/Await", "Geolocation", "Offline Cache"],
    status: "Active",
    path: "/02-Weather-Pulse/index.html",
    badge: "New"
  },
  {
    id: "03-Markdown-Live-Studio",
    name: "03. Markdown Live Studio",
    category: "Tier 1: Vanilla JS & Browser Architecture",
    description: "High-performance split-pane Markdown editor with a custom-engineered AST tokenizer, live telemetry (words, reading time), XSS sanitization, and dual-format file export.",
    tags: ["AST Tokenizer", "Regex", "Synchronized Scroll", "File Export"],
    status: "Active",
    path: "/03-Markdown-Live-Studio/index.html",
    badge: "New"
  },
  // Core Portfolio & Flagship Projects
  {
    id: "Chess",
    name: "Chess vs AI (Naty Games)",
    category: "Flagship Game Engine",
    description: "Full Chess vs AI engine with minimax algorithm, alpha-beta pruning, move validation, evaluation tables, audio effects, and dark mode.",
    tags: ["Minimax AI", "Game Engine", "Alpha-Beta", "Audio API"],
    status: "Active",
    path: "/Chess/index.html",
    badge: "Flagship"
  },
  {
    id: "PORTFOLIO",
    name: "Developer Portfolio (Natnael)",
    category: "Showcase & Identity",
    description: "Modern glassmorphic developer portfolio showcasing projects, skills, resume timeline, and interactive contact form.",
    tags: ["Portfolio", "Glassmorphism", "Responsive Design"],
    status: "Active",
    path: "/4.0%20File%20Paths/PORTFOLIO/Portfolio.html",
    badge: "Showcase"
  },
  {
    id: "Calculator",
    name: "Tactile Glassmorphism Calculator",
    category: "Interactive Utilities",
    description: "Dark-glassmorphism arithmetic evaluation engine with CSS Grid, keyboard support, precision handling, and error protection.",
    tags: ["CSS Grid", "Keyboard Input", "Math Engine"],
    status: "Active",
    path: "/Calculator/index.html",
    badge: "Complete"
  },
  {
    id: "Drum-Kit",
    name: "Interactive Drum Kit",
    category: "Web Audio & Events",
    description: "Multi-sample drum kit synthesizer mapped to 7 physical keyboard triggers with tactile animation feedback.",
    tags: ["Event Listeners", "Audio Routing", "Keydown"],
    status: "Active",
    path: "/Drum%20Kit%20Starting%20Files/index.html",
    badge: "Complete"
  },
  {
    id: "Simon-Game",
    name: "Simon Memory Challenge",
    category: "Game Loops & State",
    description: "Classic pattern memory challenge featuring randomized sequence tracking, step progression, audio synthesis, and game-over states.",
    tags: ["State Loop", "Pattern Memory", "Audio Effects"],
    status: "Active",
    path: "/Simon%20Game%20Challenge%20Starting%20Files/index.html",
    badge: "Complete"
  },
  {
    id: "Move-It",
    name: "Move It (Bootstrap 5 Landing)",
    category: "Responsive Frameworks",
    description: "Full-scale corporate moving service website with sticky navigation, zip-code validation, SVG feature matrix, customer carousel, and footer.",
    tags: ["Bootstrap 5", "Component Architecture", "Landing Page"],
    status: "Active",
    path: "/11.2%20Bootstrap%20Components/index.html",
    badge: "Complete"
  },
  {
    id: "Pricing-Table",
    name: "Flexbox Pricing Table",
    category: "Modern Layouts",
    description: "Clean responsive pricing plan comparison table with multi-tier features and responsive container reflow.",
    tags: ["Flexbox", "Responsive Breakpoints", "Typography"],
    status: "Active",
    path: "/5.%209.4%20Flexbox%20Pricing%20Table%20Project/index.html",
    badge: "Complete"
  }
];

function renderDashboard() {
  const projectCards = PROJECTS.map(p => `
    <div class="card" data-category="${p.category.toLowerCase()}" data-name="${p.name.toLowerCase()}">
      <div class="card-header">
        <span class="category-label">${p.category}</span>
        <span class="badge ${p.badge.toLowerCase()}">${p.badge}</span>
      </div>
      <h2 class="card-title">${p.name}</h2>
      <p class="card-desc">${p.description}</p>
      <div class="tags">
        ${p.tags.map(t => `<span class="tag">${t}</span>`).join("")}
      </div>
      <div class="card-footer">
        <a href="${p.path}" class="launch-btn" target="_blank" rel="noopener">
          Launch Application &rarr;
        </a>
      </div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Engineering Project Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-canvas: #0e1217;
      --bg-panel: #161b24;
      --bg-panel-hover: #1b212c;
      --border-subtle: #242c3b;
      --border-strong: #364257;
      --text-heading: #f8fafc;
      --text-body: #94a3b8;
      --text-meta: #cbd5e1;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --radius-panel: 10px;
      --radius-control: 6px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background-color: var(--bg-canvas);
      color: var(--text-heading);
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      min-height: 100vh;
      padding: 40px 24px 80px 24px;
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 36px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 28px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 12px;
    }

    h1 {
      font-family: 'Archivo', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text-heading);
    }

    .server-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      background: #13241b;
      border: 1px solid #1e452e;
      border-radius: var(--radius-control);
      font-size: 0.8125rem;
      font-weight: 500;
      color: #34d399;
      font-family: 'JetBrains Mono', monospace;
    }

    .status-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34d399;
    }

    .subtitle {
      color: var(--text-body);
      font-size: 1rem;
      max-width: 72ch;
      margin-bottom: 24px;
    }

    /* Functional Controls Bar */
    .controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      min-width: 260px;
      max-width: 440px;
    }

    .search-input {
      width: 100%;
      padding: 9px 14px;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-control);
      color: var(--text-heading);
      font-family: inherit;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .search-input:focus {
      border-color: var(--border-strong);
    }

    .search-input::placeholder {
      color: var(--text-body);
    }

    .project-count {
      font-size: 0.875rem;
      color: var(--text-meta);
      font-weight: 500;
    }

    /* Grid Layout */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }

    .card {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-panel);
      padding: 22px;
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .card:hover {
      background: var(--bg-panel-hover);
      border-color: var(--border-strong);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 8px;
    }

    .category-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-body);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid transparent;
    }

    .badge.new {
      background: #0f2c1d;
      color: #34d399;
      border-color: #1e452e;
    }

    .badge.flagship {
      background: #2f2008;
      color: #fcd34d;
      border-color: #593d10;
    }

    .badge.showcase {
      background: #0e203c;
      color: #93c5fd;
      border-color: #1e3a66;
    }

    .badge.complete {
      background: #181d30;
      color: #c7d2fe;
      border-color: #2b3558;
    }

    .card-title {
      font-family: 'Archivo', sans-serif;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-heading);
      margin-bottom: 8px;
      line-height: 1.35;
    }

    .card-desc {
      font-size: 0.875rem;
      color: var(--text-body);
      line-height: 1.55;
      margin-bottom: 18px;
      flex-grow: 1;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 18px;
    }

    .tag {
      font-size: 0.75rem;
      padding: 3px 8px;
      background: #10141b;
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      color: var(--text-meta);
      font-family: 'JetBrains Mono', monospace;
    }

    .card-footer {
      border-top: 1px solid var(--border-subtle);
      padding-top: 14px;
    }

    .launch-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 9px 14px;
      background: #1c2433;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-control);
      color: var(--text-heading);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }

    .launch-btn:hover {
      background: var(--accent);
      border-color: var(--accent);
      color: #ffffff;
    }

    footer {
      margin-top: 48px;
      text-align: center;
      color: var(--text-body);
      font-size: 0.8125rem;
      border-top: 1px solid var(--border-subtle);
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div>
          <h1>Engineering Project Hub</h1>
        </div>
        <div class="server-status">
          <span class="status-indicator"></span>
          <span>PORT ${PORT} &bull; ONLINE</span>
        </div>
      </div>
      <p class="subtitle">
        Curated repository of full-stack engineering milestones. Every application features isolated state management, zero mocked handlers, responsive architecture, and accessible semantics.
      </p>

      <div class="controls-bar">
        <div class="search-box">
          <input type="text" id="projectSearch" class="search-input" placeholder="Filter projects by title or technology..." aria-label="Filter projects">
        </div>
        <div class="project-count" id="countDisplay">
          Showing ${PROJECTS.length} applications
        </div>
      </div>
    </header>

    <main class="grid" id="projectsGrid">
      ${projectCards}
    </main>

    <footer>
      <p>Developer Workspace &bull; Local Server Runtime &bull; Port ${PORT}</p>
    </footer>
  </div>

  <script>
    const searchInput = document.getElementById('projectSearch');
    const cards = document.querySelectorAll('.card');
    const countDisplay = document.getElementById('countDisplay');

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      let visible = 0;
      cards.forEach(c => {
        const text = c.textContent.toLowerCase();
        if (!q || text.includes(q)) {
          c.style.display = 'flex';
          visible++;
        } else {
          c.style.display = 'none';
        }
      });
      countDisplay.textContent = 'Showing ' + visible + ' application' + (visible === 1 ? '' : 's');
    });
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Serve Dashboard on root
  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderDashboard());
  }

  // File resolution
  let filePath = path.join(ROOT_DIR, pathname);

  // Prevent path traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("403 Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html" });
      return res.end(`
        <body style="font-family: sans-serif; background: #090d16; color: #f8fafc; padding: 40px; text-align: center;">
          <h2>404 Not Found</h2>
          <p style="color: #94a3b8;">The requested resource <code>${pathname}</code> does not exist.</p>
          <a href="/" style="color: #38bdf8; text-decoration: none;">&larr; Back to Dev Hub</a>
        </body>
      `);
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("500 Server Error");
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`[DevHub] Engineering Server running at http://localhost:${PORT}/`);
});
