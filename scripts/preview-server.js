#!/usr/bin/env node
// Simple preview server for Ghost theme development.
// Substitutes Handlebars helpers and serves templates as HTML.
// Does not require a Ghost instance.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 2368;
const ROOT = path.join(__dirname, '..');

// ── Template processing ─────────────────────────────────────────────────────

function loadFile(relPath) {
  const abs = path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

// Strip a block helper entirely (e.g. {{#if @blog.posts}}...{{/if}})
function stripBlock(src, helper) {
  const open = new RegExp(`\\{\\{#${helper}[^}]*\\}\\}`, 'g');
  const close = new RegExp(`\\{\\{\\/${helper}\\}\\}`, 'g');
  // Replace from first open to matching close (simple non-nested pass)
  const fullPattern = new RegExp(`\\{\\{#${helper}[^}]*\\}\\}[\\s\\S]*?\\{\\{\\/${helper}\\}\\}`, 'g');
  return src.replace(fullPattern, '');
}

// Keep inner content of a block helper, discard the tags
function flattenBlock(src, helper) {
  const fullPattern = new RegExp(`\\{\\{#${helper}[^}]*\\}\\}([\\s\\S]*?)\\{\\{\\/${helper}\\}\\}`, 'g');
  return src.replace(fullPattern, '$1');
}

function processHbs(content, opts = {}) {
  const { bodyClass = 'page-template', year = new Date().getFullYear() } = opts;

  let s = content;

  // Remove layout declaration
  s = s.replace(/\{\{!<[^}]*\}\}\n?/g, '');

  // Inline partials
  s = s.replace(/\{\{> navigation\}\}/g, () => processHbs(loadFile('partials/navigation.hbs'), opts));
  s = s.replace(/\{\{> footer\}\}/g, () => processHbs(loadFile('partials/footer.hbs'), opts));
  s = s.replace(/\{\{> donate-button\}\}/g, () => processHbs(loadFile('partials/donate-button.hbs'), opts));

  // Ghost data / context helpers
  s = s.replace(/\{\{@site\.locale\}\}/g, 'en');
  s = s.replace(/\{\{meta_title\}\}/g, 'Erell Institute');
  s = s.replace(/\{\{meta_description\}\}/g, 'Education through research in behavioral ecology — open to everyone.');
  s = s.replace(/\{\{canonical_url\}\}/g, '');
  s = s.replace(/\{\{body_class\}\}/g, bodyClass);
  s = s.replace(/\{\{ghost_head\}\}/g, '<meta name="generator" content="Ghost theme preview">');
  s = s.replace(/\{\{ghost_foot\}\}/g, '');

  // Asset helper: {{asset "path/to/file"}}
  s = s.replace(/\{\{asset "([^"]+)"\}\}/g, '/assets/$1');

  // Date helper
  s = s.replace(/\{\{date[^}]*format="YYYY"[^}]*\}\}/g, String(year));
  s = s.replace(/\{\{date[^}]*\}\}/g, '');

  // Pagination (just remove)
  s = s.replace(/\{\{pagination\}\}/g, '');

  // Strip block helpers that require Ghost data (blog posts, etc.)
  s = stripBlock(s, 'if @blog\\.posts');
  s = stripBlock(s, 'get');
  s = stripBlock(s, 'foreach');

  // Flatten remaining if/unless blocks (keep inner content)
  for (let i = 0; i < 4; i++) {
    s = flattenBlock(s, 'if');
    s = flattenBlock(s, 'unless');
  }

  // Triple-mustache (unescaped HTML) — keep as-is but strip outer markers
  s = s.replace(/\{\{\{([^}]+)\}\}\}/g, '<!-- {{{$1}}} -->');

  // Remove all remaining {{ }} expressions
  s = s.replace(/\{\{[^}]*\}\}/g, '');

  return s;
}

// ── Page routes ──────────────────────────────────────────────────────────────

const routes = {
  '/':                              { template: 'index.hbs',                    bodyClass: 'home-template' },
  '/about/':                        { template: 'page-about.hbs',               bodyClass: 'page-template page-about' },
  '/contact/':                      { template: 'page-contact.hbs',             bodyClass: 'page-template page-contact' },
  '/support/':                      { template: 'page-support.hbs',             bodyClass: 'page-template page-support' },
  '/photos/':                       { template: 'page-photos.hbs',              bodyClass: 'page-template page-photos' },
  '/education/':                    { template: 'page-education.hbs',           bodyClass: 'page-template page-education' },
  '/education/lizard-camp/':        { template: 'page-lizard-camp.hbs',         bodyClass: 'page-template page-lizard-camp' },
  '/education/netp/':               { template: 'page-netp.hbs',                bodyClass: 'page-template page-netp' },
  '/research/':                     { template: 'page-research.hbs',            bodyClass: 'page-template page-research' },
  '/research/social-systems/':      { template: 'page-social-systems.hbs',      bodyClass: 'page-template page-social-systems' },
  '/research/movement-ecology/':    { template: 'page-movement-ecology.hbs',    bodyClass: 'page-template page-movement-ecology' },
  '/research/italian-wall-lizards/':{ template: 'page-italian-wall-lizards.hbs',bodyClass: 'page-template page-italian-wall-lizards' },
  '/research/publications/':        { template: 'page-publications.hbs',        bodyClass: 'page-template page-publications' },
  '/about/meet-the-team/':          { template: 'page-meet-the-team.hbs',       bodyClass: 'page-template page-meet-the-team' },
  '/about/newsletter-archive/':     { template: 'page-newsletter-archive.hbs',  bodyClass: 'page-template page-newsletter-archive' },
};

// Redirect table for paths without trailing slash
const redirects = Object.fromEntries(
  Object.keys(routes)
    .filter(r => r !== '/')
    .map(r => [r.slice(0, -1), r])
);

// ── MIME types ───────────────────────────────────────────────────────────────

const mime = {
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.svg':  'image/svg+xml',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.pdf':  'application/pdf',
  '.html': 'text/html',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

// ── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Redirect to trailing slash
  if (redirects[pathname]) {
    res.writeHead(301, { Location: redirects[pathname] });
    res.end();
    return;
  }

  // Serve files from assets/
  if (pathname.startsWith('/assets/')) {
    // Decode %20 / %5B etc. so filenames with spaces and brackets resolve
    let decodedPath = pathname;
    try { decodedPath = decodeURIComponent(pathname); } catch (e) { /* keep raw on malformed input */ }
    const filePath = path.join(ROOT, decodedPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(filePath));
      return;
    }
    res.writeHead(404); res.end('Not found'); return;
  }

  // Render page template
  const route = routes[pathname];
  if (route && fs.existsSync(path.join(ROOT, route.template))) {
    try {
      const opts = { bodyClass: route.bodyClass };
      const layoutSrc = loadFile('default.hbs');
      const pageSrc   = loadFile(route.template);

      // Process page content first, then insert into layout
      const processedBody = processHbs(pageSrc, opts);
      // Replace {{{body}}} in layout with processed page content
      const combined = layoutSrc.replace(/\{\{\{body\}\}\}/, processedBody);
      const html = processHbs(combined, opts);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Preview server error:\n' + err.stack);
    }
    return;
  }

  // Simple nav page for unknown routes
  const navLinks = Object.keys(routes)
    .map(r => `<li><a href="${r}">${r}</a></li>`)
    .join('\n');
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><html><head><title>404</title></head><body>
    <h1>Page not found: ${pathname}</h1>
    <ul>${navLinks}</ul></body></html>`);
});

server.listen(PORT, () => {
  console.log(`Ghost theme preview → http://localhost:${PORT}`);
});
