#!/usr/bin/env node
// Builds the site index (index.html) automatically.
//
// A "site" is either
//   - a public, non-fork repo of the owner that has GitHub Pages enabled and answers 200, or
//   - a top-level folder of this repo that contains an index.html.
// Titles, descriptions and groups come from sites.json when present; anything new gets a
// sensible default and lands in the default section ("More sites").
//
// Usage: node scripts/build-index.js [--dry-run]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const START = '<!-- SITES:START -->';
const END = '<!-- SITES:END -->';
const SKIP_DIRS = new Set(['node_modules', 'scripts', 'tests', 'test', 'docs-src']);

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function prettify(name) {
  const t = name.replace(/[-_]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// discovered: [{ name, description }]  (already filtered to sites that really exist)
function collectSites(config, discovered) {
  const byName = new Map();
  Object.entries(config.sites || {}).forEach(([name, s]) => {
    byName.set(name, { name, title: s.title, desc: s.desc, section: s.section || config.defaultSection, configured: true });
  });
  const hidden = new Set(config.hidden || []);
  discovered.forEach(d => {
    if (hidden.has(d.name) || byName.has(d.name)) return;
    byName.set(d.name, {
      name: d.name,
      title: prettify(d.name),
      desc: d.description || 'Published site.',
      section: config.defaultSection,
      configured: false,
    });
  });
  hidden.forEach(h => byName.delete(h));
  return [...byName.values()];
}

function renderCard(s) {
  return [
    `      <a class="card" href="/${esc(s.name)}/">`,
    `        <span class="name" dir="auto">${esc(s.title)}</span>`,
    `        <span class="desc">${esc(s.desc)}</span>`,
    `        <span class="url">/${esc(s.name)}/</span>`,
    `      </a>`,
  ].join('\n');
}

function renderSites(config, sites, stamp) {
  const known = new Set(config.sections.map(s => s.id));
  const out = [];
  config.sections.forEach(sec => {
    let list = sites.filter(s => (known.has(s.section) ? s.section : config.defaultSection) === sec.id);
    // configured sites keep the order of sites.json; newly discovered ones go last, A-Z
    const confOrder = Object.keys(config.sites || {});
    list = list.sort((a, b) => {
      if (a.configured && b.configured) return confOrder.indexOf(a.name) - confOrder.indexOf(b.name);
      if (a.configured) return -1;
      if (b.configured) return 1;
      return a.name.localeCompare(b.name);
    });
    if (!list.length) return;
    out.push(
      `  <section>\n    <h2>${esc(sec.title)}</h2>\n    <div class="grid">\n${list.map(renderCard).join('\n')}\n    </div>\n  </section>`
    );
  });
  out.push(`  <p class="stamp">Updated automatically &middot; checked ${esc(stamp)}</p>`);
  return out.join('\n\n');
}

function render(template, config, discovered, stamp) {
  const a = template.indexOf(START);
  const b = template.indexOf(END);
  if (a === -1 || b === -1 || b < a) throw new Error(`index.html must contain ${START} and ${END}`);
  const body = renderSites(config, collectSites(config, discovered), stamp);
  return template.slice(0, a + START.length) + '\n' + body + '\n  ' + template.slice(b);
}

// ---- discovery (needs network; used by main only) ----
async function api(url, token) {
  const res = await fetch(url, {
    headers: Object.assign({ Accept: 'application/vnd.github+json', 'User-Agent': 'site-index-builder' },
      token ? { Authorization: `Bearer ${token}` } : {}),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return res.json();
}

async function listRepos(owner, token) {
  const all = [];
  for (let page = 1; page < 20; page++) {
    const batch = await api(`https://api.github.com/users/${owner}/repos?per_page=100&type=owner&page=${page}`, token);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

async function isLive(owner, name) {
  try {
    const res = await fetch(`https://${owner}.github.io/${encodeURIComponent(name)}/`, { method: 'GET', redirect: 'follow' });
    return res.status === 200;
  } catch (e) { return false; }
}

function listFolders(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_') && !SKIP_DIRS.has(d.name))
    .filter(d => fs.existsSync(path.join(root, d.name, 'index.html')))
    .map(d => ({ name: d.name, description: '' }));
}

async function discover(config, token) {
  const owner = config.owner;
  const self = `${owner}.github.io`;
  const repos = (await listRepos(owner, token)).filter(r =>
    r.has_pages && !r.private && !r.archived && r.name !== self && (config.includeForks || !r.fork));
  const configured = new Set(Object.keys(config.sites || {}));
  const found = [];
  for (const r of repos) {
    // sites already in sites.json are trusted; brand-new ones must really answer 200
    if (configured.has(r.name) || (await isLive(owner, r.name))) found.push({ name: r.name, description: r.description || '' });
    else console.log(`skip ${r.name}: Pages enabled but ${owner}.github.io/${r.name}/ does not answer 200 yet`);
  }
  listFolders(ROOT).forEach(f => { if (!found.some(x => x.name === f.name)) found.push(f); });
  return found;
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));
  const file = path.join(ROOT, 'index.html');
  const template = fs.readFileSync(file, 'utf8');
  const discovered = await discover(config, process.env.GITHUB_TOKEN);

  const fresh = collectSites(config, discovered).filter(s => !s.configured);
  console.log(`Discovered ${discovered.length} sites; ${fresh.length} not in sites.json:`);
  fresh.forEach(s => console.log(`  + /${s.name}/  (${s.title}: ${s.desc})`));
  const missing = Object.keys(config.sites).filter(n => !discovered.some(d => d.name === n));
  if (missing.length) console.log(`In sites.json but not found as a Pages repo/folder (kept anyway): ${missing.join(', ')}`);

  const stamp = new Date().toISOString().slice(0, 7); // YYYY-MM: changes monthly so the repo never looks inactive
  const next = render(template, config, discovered, stamp);
  if (next === template) { console.log('Index already up to date.'); return; }
  if (dry) { console.log('Dry run: index.html would change, not writing.'); return; }
  fs.writeFileSync(file, next);
  console.log('index.html updated.');
}

module.exports = { render, collectSites, prettify, esc, listFolders };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
