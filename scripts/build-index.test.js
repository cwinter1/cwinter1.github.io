// Tests for scripts/build-index.js (no network needed).  Run: node scripts/build-index.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { render, collectSites, prettify, listFolders } = require('./build-index');

const config = {
  owner: 'me',
  defaultSection: 'more',
  hidden: ['secret'],
  sections: [{ id: 'a', title: 'Group A' }, { id: 'more', title: 'More sites' }],
  sites: {
    one: { section: 'a', title: 'One <b>&</b>', desc: 'First "site"' },
    two: { section: 'a', title: 'Two', desc: 'Second' },
  },
};
const template = 'head\n  <!-- SITES:START -->\n  OLD\n  <!-- SITES:END -->\ntail';
let n = 0;
function t(name, fn) { fn(); n++; console.log('  ok  ' + name); }

t('configured sites render in sites.json order inside their group', () => {
  const html = render(template, config, [{ name: 'two' }, { name: 'one' }], '2026-11');
  assert(html.indexOf('href="/one/"') < html.indexOf('href="/two/"'));
  assert(html.includes('<h2>Group A</h2>'));
  assert(!html.includes('OLD'));
  assert(html.startsWith('head\n') && html.endsWith('tail'));
});
t('titles and descriptions are HTML-escaped', () => {
  const html = render(template, config, [], '2026-11');
  assert(html.includes('One &lt;b&gt;&amp;&lt;/b&gt;'));
  assert(html.includes('First &quot;site&quot;'));
  assert(!html.includes('<b>'));
});
t('a new site appears automatically under the default section with a readable name', () => {
  const html = render(template, config, [{ name: 'my-new_game', description: 'A fresh game' }], '2026-11');
  assert(html.includes('href="/my-new_game/"'));
  assert(html.includes('My new game'));
  assert(html.includes('A fresh game'));
  assert(html.indexOf('<h2>More sites</h2>') < html.indexOf('/my-new_game/'));
});
t('a new site without a description still gets one', () => {
  const s = collectSites(config, [{ name: 'x', description: '' }]).find(s => s.name === 'x');
  assert.strictEqual(s.desc, 'Published site.');
});
t('hidden sites never appear', () => {
  const html = render(template, config, [{ name: 'secret', description: 'x' }], '2026-11');
  assert(!html.includes('secret'));
});
t('new sites are sorted A-Z after the configured ones', () => {
  const html = render(template, config, [{ name: 'zeta' }, { name: 'alpha' }], '2026-11');
  assert(html.indexOf('/two/') < html.indexOf('/alpha/') && html.indexOf('/alpha/') < html.indexOf('/zeta/'));
});
t('an empty group is not rendered', () => {
  const html = render(template, config, [], '2026-11');
  assert(!html.includes('<h2>More sites</h2>'));
});
t('a configured site with an unknown section falls back to the default section', () => {
  const c = JSON.parse(JSON.stringify(config)); c.sites.one.section = 'nope';
  assert(render(template, c, [], 'x').includes('<h2>More sites</h2>'));
});
t('rendering twice gives identical output (no needless commits)', () => {
  const once = render(template, config, [{ name: 'new1' }], '2026-11');
  assert.strictEqual(render(once, config, [{ name: 'new1' }], '2026-11'), once);
});
t('the monthly stamp changes the output only when the month changes', () => {
  const a = render(template, config, [], '2026-11');
  assert.strictEqual(a, render(a, config, [], '2026-11'));
  assert.notStrictEqual(a, render(a, config, [], '2026-12'));
});
t('missing markers is an error, not a silent no-op', () => {
  assert.throws(() => render('no markers here', config, [], 'x'), /SITES:START/);
});
t('prettify turns repo names into titles', () => {
  assert.strictEqual(prettify('sofia-fractions'), 'Sofia fractions');
  assert.strictEqual(prettify('a_b'), 'A b');
});
t('folders with an index.html are discovered; dot, underscore and tool folders are not', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'idx-'));
  ['site1', '.git', '_private', 'scripts', 'empty'].forEach(f => fs.mkdirSync(path.join(d, f)));
  ['site1', '.git', '_private', 'scripts'].forEach(f => fs.writeFileSync(path.join(d, f, 'index.html'), 'x'));
  assert.deepStrictEqual(listFolders(d).map(f => f.name), ['site1']);
});
t('the real sites.json is valid and every configured section exists', () => {
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sites.json'), 'utf8'));
  const ids = new Set(real.sections.map(s => s.id));
  assert(ids.has(real.defaultSection));
  Object.entries(real.sites).forEach(([name, s]) => {
    assert(ids.has(s.section), name + ' has an unknown section');
    assert(s.title && s.desc, name + ' needs a title and desc');
  });
});
t('the real index.html has the markers', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(html.includes('<!-- SITES:START -->') && html.includes('<!-- SITES:END -->'));
});

console.log(`\n${n} passed`);
