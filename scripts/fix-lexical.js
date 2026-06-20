#!/usr/bin/env node
// Converts pages stored in mobiledoc format to lexical by wrapping their HTML
// in a lexical HTML card. Run once after the initial migration.

const crypto = require('crypto');
const http = require('http');

const KEY_ID = '6a3695594f8a9313dac9be89';
const KEY_SECRET = '075baf9fbd1be478034d1c2f2dd7a488a1f5b24939914a15af68393ee3901752';
const HOST = '127.0.0.1';
const PORT = 2369;

const SLUGS = [
  'about', 'contact', 'support', 'photos', 'education',
  'lizard-camp', 'netp', 'research', 'social-systems',
  'movement-ecology', 'italian-wall-lizards', 'publications',
  'meet-the-team', 'newsletter-archive',
];

function makeToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: KEY_ID })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url');
  const sig = crypto.createHmac('sha256', Buffer.from(KEY_SECRET, 'hex'))
    .update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: HOST, port: PORT, method, path,
      headers: {
        'Authorization': `Ghost ${makeToken()}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}


async function fixPage(slug) {
  const get = await request('GET', `/ghost/api/admin/pages/slug/${slug}/?formats=mobiledoc,lexical`);
  if (get.status !== 200) {
    console.error(`  GET ${slug} → ${get.status}`);
    return;
  }
  const page = get.body.pages[0];

  // Skip if already lexical (lexical is non-null string)
  if (typeof page.lexical === 'string') {
    console.log(`  ${slug}: already lexical, skipping`);
    return;
  }

  if (!page.mobiledoc) {
    console.log(`  ${slug}: no mobiledoc content, skipping`);
    return;
  }

  // Use Ghost's built-in convert_to_lexical option — converts mobiledoc in place
  const put = await request('PUT', `/ghost/api/admin/pages/${page.id}/?convert_to_lexical=true`, {
    pages: [{ id: page.id, updated_at: page.updated_at }],
  });

  if (put.status === 200) {
    console.log(`  ✓ ${slug}`);
  } else {
    console.error(`  ✗ ${slug} → ${put.status}`, JSON.stringify(put.body).slice(0, 200));
  }
}

(async () => {
  console.log('Converting mobiledoc pages to lexical...');
  for (const slug of SLUGS) {
    await fixPage(slug);
  }
  console.log('Done.');
})();
