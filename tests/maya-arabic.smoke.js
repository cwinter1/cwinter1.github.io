// Smoke test for Maya's Arabic exam game (maya-arabic/).
//
//   npm install --no-save playwright && npx playwright install chromium   (once)
//   node tests/maya-arabic.smoke.js                                        (tests ./maya-arabic/index.html)
//   SMOKE_URL=https://cwinter1.github.io/maya-arabic/ node tests/maya-arabic.smoke.js   (tests the live site)
//
// Drives the page with real clicks in headless Chromium (phone-sized) and exits
// non-zero if anything is broken.

const path = require('path');
const { chromium } = require('playwright');

const URL = process.env.SMOKE_URL || 'file://' + path.resolve(__dirname, '..', 'maya-arabic', 'index.html');
const MISSIONS = 5;
const MAX = 100;

const failures = [];
let passed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failures.push(name); console.log('  FAIL ' + name + (detail !== undefined ? '  -> ' + detail : '')); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });

  // record every oscillator started, to prove sound is produced
  await page.addInitScript(() => {
    window.__osc = [];
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const orig = AC.prototype.createOscillator;
    AC.prototype.createOscillator = function () {
      const o = orig.call(this);
      const start = o.start.bind(o);
      o.start = t => { window.__osc.push(1); return start(t); };
      return o;
    };
  });

  // ---- real-click helpers ----
  // join Arabic item ai to number item bi (by taps, or by a real mouse drag)
  const centerOf = async (pg, id) => { const r = await pg.locator('#' + id).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
  async function tapLink(pg, ai, bi) { await pg.locator('#ma' + ai).click(); await pg.locator('#mb' + bi).click(); }
  async function dragLink(pg, ai, bi) {
    const [x1, y1] = await centerOf(pg, 'ma' + ai), [x2, y2] = await centerOf(pg, 'mb' + bi);
    await pg.mouse.move(x1, y1); await pg.mouse.down();
    await pg.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, { steps: 5 });
    await pg.mouse.move(x2, y2, { steps: 5 }); await pg.mouse.up();
  }
  // the right partner of every Arabic item (or a wrong one: shifted by one place, so nothing is right)
  const matchPlan = (pg, right) => pg.evaluate(right => mt.a.map((p, ai) => {
    const bi = mt.b.findIndex(x => x.v === p.v);
    return [ai, right ? bi : (bi + 1) % mt.n];
  }), right);

  async function answerQuestion(right, skipNext) {
    const type = await page.evaluate(() => currentRound[currentQ].type);
    if (type === 'choice') {
      const [correct, n] = await page.evaluate(() => [currentQuestion.correct, document.querySelectorAll('.choice-btn').length]);
      await page.locator('.choice-btn').nth(right ? correct : (correct + 1) % n).click();
    } else if (type === 'tf') {
      const ans = await page.evaluate(() => currentQuestion.ans);
      await page.locator(ans === right ? '.true-btn' : '.false-btn').click();
    } else if (type === 'order') {
      let idx = await page.evaluate(() => orderState.q.items.map(it => orderState.items.indexOf(it)));
      if (!right) idx = idx.reverse();
      for (const i of idx) await page.locator('#oi' + i).click();
    } else if (type === 'sort') {
      const buckets = await page.evaluate(() => sortState.q.items.map(i => i.bucket));
      for (let i = 0; i < buckets.length; i++) {
        await page.locator('#si' + i).click();
        await page.locator('#feedback button').nth(right ? buckets[i] : 1 - buckets[i]).click();
      }
    }
    else if (type === 'match') {
      for (const [ai, bi] of await matchPlan(page, right)) await tapLink(page, ai, bi);
      await page.locator('#btn-check').click();
    }
    // flip cards need no answer
    await page.locator('#next-btn.show').waitFor();
    if (!skipNext) await page.locator('#next-btn').click();
    return type;
  }

  // plays one full mission; returns {score, questions}
  async function playMission(index, right) {
    await page.locator('.mission-card').nth(index).click();
    const n = await page.evaluate(() => currentRound.length);
    const questions = await page.evaluate(() => currentRound.map(q => q.type === 'flipcards' ? q.cards[0].front : q.q));
    for (let k = 0; k < n; k++) await answerQuestion(right);
    await page.locator('#mission-end').waitFor({ state: 'visible' });
    const score = parseInt((await page.locator('#me-score').innerText()).trim(), 10);
    return { score, questions };
  }
  const backHome = () => page.locator('#mission-end .next-btn').click();

  // ---------------------------------------------------------------
  console.log('\nLoad');
  await page.goto(URL);
  check('page loads with a title', (await page.title()).length > 0);
  check(`home shows ${MISSIONS} mission cards`, (await page.locator('.mission-card').count()) === MISSIONS);
  check('exam countdown is filled in', /^\d+$/.test(await page.locator('#days-left').innerText()));
  check('sound button is present', await page.locator('#sound-btn').isVisible());

  // ---------------------------------------------------------------
  console.log('\nQuestion data');
  const data = await page.evaluate(() => {
    const issues = [];
    MISSIONS.forEach(m => {
      const seen = new Set();
      m.questions.forEach((q, i) => {
        const w = `mission ${m.id} #${i} (${q.type})`;
        const key = q.type === 'flipcards' ? q.cards[0].front : (q.type === 'order' || q.type === 'sort') ? q.q + JSON.stringify(q.items) : q.type === 'match' ? q.group + '#' + q.slot : q.q;
        if (seen.has(key)) issues.push('duplicate question: ' + w);
        seen.add(key);
        if (q.type !== 'flipcards' && q.type !== 'match' && !q.exp) issues.push('missing explanation: ' + w);
        if (q.type === 'choice') {
          if (!(q.ans >= 0 && q.ans < q.opts.length)) issues.push('answer index out of range: ' + w);
          if (new Set(q.opts).size !== q.opts.length) issues.push('duplicate options: ' + w);
        } else if (q.type === 'tf') {
          if (typeof q.ans !== 'boolean') issues.push('tf answer not boolean: ' + w);
        } else if (q.type === 'order') {
          if (new Set(q.items).size !== q.items.length) issues.push('duplicate order items: ' + w);
        } else if (q.type === 'sort') {
          if (!q.items.some(x => x.bucket === 0) || !q.items.some(x => x.bucket === 1)) issues.push('sort has an empty bucket: ' + w);
        } else if (q.type === 'match') {
          if (!(q.pool && new Set(q.pool).size >= 5 && q.count === 5)) issues.push('a match question needs a pool of at least 5 different numbers and count 5: ' + w);
        } else if (q.type !== 'flipcards') issues.push('unknown type: ' + w);
      });
    });
    return { issues, sizes: MISSIONS.map(m => m.questions.length) };
  });
  check('every mission has a pool big enough for 2 distinct rounds', data.sizes.every(s => s >= 12), data.sizes.join(','));
  check('all questions are well-formed (no duplicates, valid answers)', data.issues.length === 0, data.issues.slice(0, 3).join(' | '));
  const gifOk = await page.evaluate(() => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = 'success.gif'; }));
  check('success.gif loads', gifOk);

  // ---------------------------------------------------------------
  console.log('\nScoring (real clicks)');
  const firstRounds = [];
  for (let m = 0; m < MISSIONS; m++) {
    const r = await playMission(m, true);
    firstRounds.push(r.questions);
    check(`mission ${m + 1}: perfect play scores exactly ${MAX}`, r.score === MAX, r.score);
    if (m === 0) {
      // the gif is fetched with a cache-busting URL, so over the network give it a moment to arrive
      const gif = await page.waitForFunction(() => {
        const i = document.getElementById('me-gif');
        return getComputedStyle(i).display !== 'none' && i.complete && i.naturalWidth > 0;
      }, null, { timeout: 8000 }).then(() => true, () => false);
      check('perfect result shows the success gif', gif);
    }
    await backHome();
  }
  check(`home screen total after all missions is ${MISSIONS * MAX}`, (await page.evaluate(() => Math.round(totalScore))) === MISSIONS * MAX);

  console.log('\nEnd screen');
  await page.locator('#end-screen').waitFor({ state: 'visible', timeout: 5000 }).then(
    () => check('end screen appears after all missions', true),
    () => check('end screen appears after all missions', false));
  check('end screen shows the full total', (await page.locator('#final-score').innerText()).trim() === String(MISSIONS * MAX));
  check('end screen lists every mission', (await page.locator('.score-row').count()) === MISSIONS);
  await page.locator('.restart-btn').click();

  // ---------------------------------------------------------------
  console.log('\nReplay');
  const replay = await playMission(0, true);
  check('replay gives different questions than the first play', replay.questions.every(q => !firstRounds[0].includes(q)));
  check('replay scores 100 again', replay.score === MAX, replay.score);
  const afterReplay = await page.evaluate(() => Math.round(totalScore));
  check('replay does not double count the total', afterReplay === MAX, afterReplay);
  await backHome();

  console.log('\nWrong answers');
  const bad = await playMission(1, false);
  check('wrong answers score below 100', bad.score < MAX, bad.score);
  const hidden = await page.evaluate(() => getComputedStyle(document.getElementById('me-gif')).display === 'none');
  check('low result hides the success gif', bad.score < 70 ? hidden : true);
  await backHome();

  console.log('\nLearning note after a mistake');
  // every question type, answered wrong, must show the note with the correct answer;
  // answered right it must not. Force a one-question round of each type.
  const missionWith = { choice: 0, tf: 0, order: 0, sort: 0, match: 2 };
  for (const type of ['choice', 'tf', 'order', 'sort', 'match']) {
    await page.evaluate(([t, m]) => {
      const orig = pickRound;
      pickRound = mission => [mission.questions.find(q => q.type === t)];
      startMission(m);
      pickRound = orig;
    }, [type, missionWith[type]]);
    await answerQuestion(false, true);
    const note = page.locator('#feedback .learn-note');
    const shown = (await note.count()) === 1;
    const text = shown ? await note.innerText() : '';
    check(`${type}: wrong answer shows the learning note with the correct answer`, shown && text.includes('התשובה הנכונה'), text.slice(0, 60));
    check(`${type}: the note offers a topic refresher`, shown && (await note.locator('details').count()) === 1);
    await page.evaluate(() => goHome());
    await page.evaluate(([t, m]) => {
      const orig = pickRound;
      pickRound = mission => [mission.questions.find(q => q.type === t)];
      startMission(m);
      pickRound = orig;
    }, [type, missionWith[type]]);
    await answerQuestion(true, true);
    check(`${type}: a correct answer shows no learning note`, (await page.locator('#feedback .learn-note').count()) === 0);
    await page.evaluate(() => goHome());
  }

  // ---------------------------------------------------------------
  console.log('\nMatching game (join with a line)');
  // starts the matching mission with one question; `values` (e.g. '5,6,7,8,9') forces the numbers, otherwise they are random
  const startMatch = (pg, values) => pg.evaluate(vals => {
    const orig = pickRound;
    pickRound = m => [m.questions.find(q => q.type === 'match')];
    startMission(2);
    pickRound = orig;
    if (vals) renderMatch({ ...currentRound[0], values: vals.split(',').map(Number) }, document.getElementById('question-area'));
  }, values);
  const lines = pg => pg.locator('#match-lines line').count();
  const score = pg => pg.evaluate(() => Math.round(missionScore));

  await startMatch(page, '5,6,7,8,9');
  check('match: two columns of 5, Arabic numerals and normal numbers', (await page.locator('.match-col').count()) === 2 && (await page.locator('.match-item').count()) === 10);
  check('match: the Arabic column shows Arabic-Indic digits', (await page.locator('#ma0').innerText()).trim().match(/^[٠-٩]+$/) !== null);
  check('match: the columns do not start lined up', await page.evaluate(() => !mt.b.every((p, i) => p === mt.a[i])));
  await tapLink(page, 0, 0);
  check('match: tapping an Arabic numeral and then a number draws a line', (await lines(page)) === 1);
  await page.locator('#mb1').click(); await page.locator('#ma0').click();   // pick a number, then an already-joined Arabic item
  check('match: joining an item again moves its line (one line per item)', (await lines(page)) === 1 && (await page.evaluate(() => mt.links.get(0))) === 1);
  await page.locator('#ma0').click();
  check('match: tapping a joined item removes its line', (await lines(page)) === 0);
  await tapLink(page, 3, 4); await tapLink(page, 1, 4);      // two Arabic numerals to the same number: the second takes the line
  check('match: a number can have only one line (the new one replaces the old)', (await lines(page)) === 1 && (await page.evaluate(() => mt.links.has(3))) === false && (await page.evaluate(() => mt.links.get(1))) === 4);
  await page.locator('#btn-clear').click();
  await dragLink(page, 2, 3);
  check('match: dragging from one column to the other draws a line', (await lines(page)) === 1 && (await page.evaluate(() => mt.links.get(2))) === 3);
  await dragLink(page, 4, 4); await dragLink(page, 1, 0);
  await page.locator('#btn-check').click();
  check('match: check with missing lines asks her to join all (nothing revealed)', (await page.locator('#feedback.show').count()) === 0 && (await page.evaluate(() => !mt.locked)));
  await page.locator('#btn-clear').click();
  check('match: the clear button removes every line', (await lines(page)) === 0);
  await page.evaluate(() => goHome());

  await startMatch(page, '5,6,7,8,9');
  for (const [ai, bi] of await matchPlan(page, true)) await dragLink(page, ai, bi);
  await page.locator('#btn-check').click();
  check('match: all five joined right gives full credit', (await score(page)) === 100, await score(page));
  check('match: right lines turn green', (await page.locator('#match-lines line.l-ok').count()) === 5);
  const frozen = await page.evaluate(() => JSON.stringify([...mt.links]));
  await tapLink(page, 0, 1);
  check('match: lines are locked after checking', (await page.evaluate(() => JSON.stringify([...mt.links]))) === frozen);
  await page.evaluate(() => goHome());

  await startMatch(page, '5,6,7,8,9');
  const plan = await matchPlan(page, true);
  [plan[0][1], plan[1][1]] = [plan[1][1], plan[0][1]];       // swap two partners: 3 of 5 right
  for (const [ai, bi] of plan) await tapLink(page, ai, bi);
  await page.locator('#btn-check').click();
  check('match: 3 of 5 right gives 60%', (await score(page)) === 60, await score(page));
  check('match: wrong lines turn red', (await page.locator('#match-lines line.l-bad').count()) === 2);
  const note = await page.locator('#feedback .learn-note').innerText();
  check('match: the note lists every correct pair', ['٥ = 5', '٦ = 6', '٧ = 7', '٨ = 8', '٩ = 9'].every(t => note.replace(/\s+/g, ' ').includes(t)), note.slice(0, 120));
  await page.evaluate(() => goHome());

  await startMatch(page, '5,6,7,8,9');
  for (const [ai, bi] of await matchPlan(page, false)) await tapLink(page, ai, bi);
  await page.locator('#btn-check').click();
  check('match: all wrong gives no credit', (await score(page)) === 0);
  await page.evaluate(() => goHome());

  // different NUMBERS every time, not just different positions
  const variety = await page.evaluate(() => {
    const area = document.getElementById('question-area'), out = {};
    MISSIONS[2].questions.filter(q => q.type === 'match' && q.slot === 0).forEach(q => {
      const sets = new Set(); let back = 0, prev = '';
      for (let k = 0; k < 60; k++) {
        renderMatch(q, area);
        const key = mt.a.map(p => p.v).sort((x, y) => x - y).join();
        sets.add(key); if (key === prev) back++; prev = key;
        if (mt.n !== 5 || new Set(mt.a.map(p => p.v)).size !== 5) back += 1000;           // always 5 different numbers
        if (!mt.a.every(p => q.pool.includes(p.v))) back += 1000;                         // always from the group's range
      }
      out[q.group] = { distinct: sets.size, back };
    });
    return out;
  });
  Object.entries(variety).forEach(([group, v]) => check(`match "${group}": 60 showings give ${'>= 25'} different sets of numbers`, v.distinct >= 25, v.distinct + ' distinct'));
  check('match: the same 5 numbers never come twice in a row, always 5 different numbers from the right range', Object.values(variety).every(v => v.back === 0), JSON.stringify(variety));
  // with only 6 numbers to choose from there are 6 possible sets, so without the guard the same set would repeat about 1 time in 6
  const backToBack = await page.evaluate(() => {
    const area = document.getElementById('question-area'); let back = 0, prev = '';
    for (let k = 0; k < 300; k++) {
      renderMatch({ type: 'match', group: 'tiny', pool: [1, 2, 3, 4, 5, 6], count: 5, q: 'x' }, area);
      const key = mt.a.map(p => p.v).sort((x, y) => x - y).join();
      if (key === prev) back++; prev = key;
    }
    return back;
  });
  check('match: the same numbers never repeat back to back (300 tries, 6-number pool)', backToBack === 0, backToBack + ' repeats');
  const aOrders = new Set(), bOrders = new Set();
  let lined = 0;
  for (let k = 0; k < 14; k++) {
    await startMatch(page, '5,6,7,8,9');
    const [a, b] = await page.evaluate(() => [mt.a.map(p => p.v).join(), mt.b.map(p => p.v).join()]);
    aOrders.add(a); bOrders.add(b); if (a === b) lined++;
    await page.evaluate(() => goHome());
  }
  check('match: the Arabic column is shuffled every time', aOrders.size >= 5, aOrders.size + ' orders in 14 tries');
  check('match: the numbers column is shuffled every time', bOrders.size >= 5, bOrders.size + ' orders in 14 tries');
  check('match: the two columns never start lined up', lined === 0, lined + ' of 14');
  // a set of only two numbers lines up by luck half of the time, so 300 tries prove the guard really works
  await startMatch(page, '5,6,7,8,9');
  const aligned = await page.evaluate(() => {
    let n = 0;
    for (let k = 0; k < 300; k++) {
      renderMatch({ values: [1, 2], q: 'x', exp: 'x' }, document.getElementById('question-area'));
      if (mt.a.every((p, i) => p === mt.b[i])) n++;
    }
    return n;
  });
  check('match: even a two-number set never starts lined up (300 tries)', aligned === 0, aligned + ' of 300');
  await page.evaluate(() => goHome());

  // two-digit numbers fit in the boxes
  await startMatch(page, '10,20,30,40,50');
  const fits = await page.evaluate(() => [...document.querySelectorAll('.match-item')].every(b => b.scrollWidth <= b.clientWidth + 1));
  check('match: two-digit numerals fit inside their boxes', fits);
  await page.evaluate(() => goHome());

  // real touch input, like a phone (pointer events from a finger)
  const mctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const mp = await mctx.newPage();
  await mp.goto(URL);
  await startMatch(mp, '0,1,2,3,4');
  const cdp = await mctx.newCDPSession(mp);
  const [ax, ay] = await centerOf(mp, 'ma0'), [bx, by] = await centerOf(mp, 'mb2');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ax, y: ay, id: 1 }] });
  for (const f of [0.25, 0.5, 0.75, 1]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ax + (bx - ax) * f, y: ay + (by - ay) * f, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check('match: dragging a line with a finger works on a phone', (await mp.evaluate(() => mt.links.get(0))) === 2, await mp.evaluate(() => JSON.stringify([...mt.links])));
  check('match: dragging with a finger does not scroll the page', (await mp.evaluate(() => window.scrollY)) === 0);
  await mctx.close();

  // ---------------------------------------------------------------
  console.log('\nNew questions and shuffled answers every time');
  const orders = new Set();
  for (let k = 0; k < 14; k++) {
    await page.evaluate(() => {
      const orig = pickRound;
      pickRound = m => [m.questions.find(q => q.type === 'choice' && !q.fixed)];
      startMission(0);
      pickRound = orig;
    });
    orders.add(await page.evaluate(() => [...document.querySelectorAll('.choice-btn')].map(b => b.textContent.trim()).join('|')));
    await page.evaluate(() => goHome());
  }
  check('the answer order changes between plays of the same question', orders.size >= 3, orders.size + ' different orders in 14 tries');
  const seen = new Set();
  for (let r = 0; r < 3; r++) {
    const q = await page.evaluate(() => { startMission(1); const t = currentRound.map(x => x.q || x.cards[0].front); goHome(); return t; });
    q.forEach(t => seen.add(t));
  }
  check('three plays of one mission show 3 different sets of questions (pool is large enough)', seen.size >= 14, seen.size + ' distinct questions in 3 plays');

  // ---------------------------------------------------------------
  console.log('\nArabic content self-checks');
  const content = await page.evaluate(() => {
    const issues = [];
    const strip = h => h.replace(/<[^>]+>/g, '').trim();
    const base = w => w.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا');   // no vowel marks, plain alif
    // the Arabic numerals: toAr() must give the Arabic-Indic digits (U+0660-0669), left to right
    NUM_VALUES.forEach(v => {
      const expected = [...String(v)].map(c => String.fromCodePoint(0x660 + Number(c))).join('');
      if (toAr(v) !== expected) issues.push(`toAr(${v}) is ${toAr(v)}, expected ${expected}`);
    });
    // exactly the numbers from the board: 0-9, 11-19 and the tens
    const want = [...Array(10).keys(), ...Array.from({ length: 9 }, (_, i) => 11 + i), 10, 20, 30, 40, 50, 60, 70, 80, 90].sort((a, b) => a - b).join(',');
    if ([...NUM_VALUES].sort((a, b) => a - b).join(',') !== want) issues.push('NUM_VALUES is not 0-9, 11-19 and the tens');
    // the matching questions draw from pools: together they cover exactly the board's numbers, nothing outside it
    const pools = Q_NUMS.filter(q => q.type === 'match').map(q => q.pool);
    const covered = new Set(pools.flat());
    NUM_VALUES.forEach(v => { if (!covered.has(v)) issues.push(`${v} is in no matching pool`); });
    covered.forEach(v => { if (!NUM_VALUES.includes(v)) issues.push(`${v} is not on the board`); });
    pools.forEach(pl => { if (new Set(pl).size !== pl.length) issues.push('a pool has a repeated number'); });
    // study cards: the numeral on the front is the number on the back
    Q_NUMS.filter(q => q.type === 'flipcards').forEach(q => q.cards.forEach(c => {
      if (strip(c.front) !== toAr(Number(c.back.replace('= ', '')))) issues.push(`card ${strip(c.front)} does not show ${c.back}`);
    }));
    // Persian/Urdu digits (U+06F0-06F9) look different from Arabic ones: they must never appear
    if (/[\u06F0-\u06F9]/.test(JSON.stringify(MISSIONS))) issues.push('Persian digits found');
    // the Arabic number words were removed on purpose (the exam is about the numerals)
    if (/ثَلَاثَة|خَمْسَة|عِشْرُون/.test(JSON.stringify(MISSIONS))) issues.push('Arabic number words are back');
    // "my": base + kasra + yaa
    NOUNS.forEach(([b, mine]) => { if (mine !== b + '\u0650\u064A') issues.push(`${mine} is not ${b} + ـِي`); });
    // letters: first-letter and contains-letter questions are true
    Q_WORDS.forEach(q => {
      if (q.type !== 'choice') return;
      const arIn = h => (h.match(/<span class="ar[^"]*"[^>]*>([^<]+)<\/span>/) || [])[1];
      if (q.q.includes('מתחילה')) {
        const w = arIn(q.q), letter = strip(q.opts[q.ans]);
        if (base(w)[0] !== letter) issues.push(`first letter of ${w} is not ${letter}`);
        q.opts.forEach((o, i) => { if (i !== q.ans && base(w)[0] === strip(o)) issues.push(`wrong option is also correct: ${w}`); });
      }
      if (q.q.includes('מופיעה האות')) {
        const letter = arIn(q.q);
        if (!base(strip(q.opts[q.ans])).includes(letter)) issues.push(`${strip(q.opts[q.ans])} has no ${letter}`);
        q.opts.forEach((o, i) => { if (i !== q.ans && base(strip(o)).includes(letter)) issues.push(`wrong option also contains ${letter}: ${strip(o)}`); });
      }
    });
    // ---- the content must match the first lesson of the Ministry's book (the spec is written out here on purpose) ----
    // letters "ארז דוד" = alif, rā, zāy, dāl, wāw, dhāl, plus yā; dots: zāy and dhāl one above, yā two below, the rest none
    const spec = { 'ا': 'בלי נקודות', 'ر': 'בלי נקודות', 'ز': 'נקודה אחת מעל', 'د': 'בלי נקודות', 'و': 'בלי נקודות', 'ذ': 'נקודה אחת מעל', 'ي': 'שתי נקודות מתחת' };
    if (LET.map(l => l.ch).join('') !== 'ارزدوذي') issues.push('the letters are not ا ر ز د و ذ ي: ' + LET.map(l => l.ch).join(''));
    if (ARAZ.map(i => LET[i].ch).join('') !== 'ارزدوذ') issues.push('"ארז דוד" is not ا ر ز د و ذ');
    LET.forEach(l => { if (l.dots !== spec[l.ch]) issues.push(`dots of ${l.ch} should be "${spec[l.ch]}"`); });
    const names = { 'ا': 'אלף', 'ر': 'רא', 'ز': 'זאי', 'د': 'דאל', 'و': 'ואו', 'ذ': 'ד׳אל', 'ي': 'יא' };
    LET.forEach(l => { if (l.name !== names[l.ch]) issues.push(`name of ${l.ch} should be ${names[l.ch]}`); });
    // the words on the lesson cards (and nothing else)
    const cards = ['زَارَ', 'يَوْم', 'دَار', 'مُدِير', 'أَرْز', 'نُورِي', 'دَوْلَة'];
    if (WORDS.map(w => w[0]).join('|') !== cards.join('|')) issues.push('the words are not the 7 cards of the lesson');
    // "my": only nouns from the lesson's words (and يَد from the board)
    NOUNS.forEach(([b]) => { if (![...cards, 'يَد'].includes(b)) issues.push(`${b} is not a word from the lesson`); });
    // "which letter is in the word": the right one is in the word, the wrong ones are not
    Q_WORDS.forEach(q => {
      if (q.type !== 'choice' || !q.q.includes('איזו אות מופיעה במילה')) return;
      const w = base((q.q.match(/<span class="ar[^"]*"[^>]*>([^<]+)<\/span>/) || [])[1]);
      q.opts.forEach((o, i) => { const has = w.includes(strip(o)); if (has !== (i === q.ans)) issues.push(`letter ${strip(o)} ${has ? 'is' : 'is not'} in ${w}`); });
    });
    // syllables: the Arabic vowel mark matches the Hebrew vowel (fatha = pataḥ, kasra = ḥiriq) and the letter matches
    const heLetter = { 'د': 'ד', 'ر': 'ר', 'و': 'ו', 'ز': 'ז' };
    SYL.forEach(([ar, he]) => {
      if (ar.includes('\u064E') !== he.includes('\u05B7')) issues.push(`${ar} and ${he}: fatha must be pataḥ`);
      if (ar.includes('\u0650') !== he.includes('\u05B4')) issues.push(`${ar} and ${he}: kasra must be ḥiriq`);
      if (he[0] !== heLetter[ar[0]]) issues.push(`${ar} and ${he}: different letters`);
    });
    // the Arabic vowel marks exist only as fatha/kasra here (the lesson has no other vowel yet)
    // (the lesson word مُدِير has a damma inside it; that is fine, but no question is about it)
    if (/[\u064F\u064B\u064C\u064D]/.test(JSON.stringify(Q_VOWELS).split(cards[3]).join(''))) issues.push('an unexpected vowel mark (damma/tanwin) in the vowels mission');
    // every single Arabic letter shown anywhere (an option, a sort item, a letter in a question) is one of ארז דוד + יא;
    // and the letters mission contains no other Arabic letter at all (not even as a wrong answer)
    const allowed = 'ارزدوذي';
    const strings = [];
    const walk = v => { if (typeof v === 'string') strings.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    MISSIONS.forEach(m => walk(m.questions));
    strings.forEach(str => {
      for (const m of str.matchAll(/<span class="ar[^"]*"[^>]*>([^<]*)<\/span>/g)) {
        const letters = base(m[1]);
        if (letters.length === 1 && /[\u0621-\u064A]/.test(letters) && !allowed.includes(letters)) issues.push(`the letter ${letters} is shown but is not in ארז דוד + יא`);
      }
    });
    const lettersMissionText = JSON.stringify(MISSIONS[0].questions) + MISSIONS[0].lesson;
    [...new Set(lettersMissionText.match(/[\u0621-\u063A\u0641-\u064A]/g))].forEach(ch => { if (!allowed.includes(ch)) issues.push(`the letters mission contains the letter ${ch}`); });
    // letters that are NOT in lesson 1 must never be taught as lesson letters
    if (/[بتثجحخ]/.test(LET.map(l => l.ch).join(''))) issues.push('a letter from outside lesson 1 is in LET');
    // letters: names and dots are consistent
    if (new Set(LET.map(l => l.name)).size !== LET.length) issues.push('two letters share a name');
    return issues;
  });
  check('Arabic numerals, matching pools, "my" forms and letter-in-word claims are consistent', content.length === 0, content.slice(0, 3).join(' | '));

  // ---------------------------------------------------------------
  console.log('\nNothing broken on screen (every question, answered right and wrong)');
  // Plays every single question of every mission, answering right and then wrong, and reads the text on the screen:
  // raw markup (<span ...>), &quot; and the like, "undefined" or "NaN" must never show.
  const leaks = await page.evaluate(async () => {
    const issues = [], sleep = ms => new Promise(r => setTimeout(r, ms));
    const bad = /<\/?span|class="|&lt;|&gt;|&quot;|&amp;|\bundefined\b|\bNaN\b|\[object/;
    let played = 0;
    for (const m of MISSIONS) {
      for (let qi = 0; qi < m.questions.length; qi++) {
        for (const right of [true, false]) {
          const orig = pickRound; pickRound = mm => [mm.questions[qi]]; startMission(m.id); pickRound = orig;
          const q = currentRound[0];
          if (q.type === 'choice') answerChoice(right ? currentQuestion.correct : (currentQuestion.correct + 1) % 4);
          else if (q.type === 'tf') answerTF(right ? q.ans : !q.ans);
          else if (q.type === 'order') { const o = orderState.q.items.map(it => orderState.items.indexOf(it)); (right ? o : o.reverse()).forEach(i => selectOrderItem(i)); }
          else if (q.type === 'sort') { q.items.forEach((it, i) => { pickSortItem(i); placeSortItem(right ? it.bucket : 1 - it.bucket); }); await sleep(450); }
          else if (q.type === 'match') { mt.a.forEach((p, ai) => { const bi = mt.b.findIndex(x => x.v === p.v); matchLink(ai, right ? bi : (bi + 1) % mt.n); }); matchCheck(); }
          const text = document.getElementById('game-screen').innerText;
          const hit = text.match(new RegExp('.{0,40}(' + bad.source + ').{0,40}'));
          if (hit) issues.push(`${m.id}#${qi} ${q.type} ${right ? 'right' : 'wrong'}: ${hit[0].replace(/\s+/g, ' ')}`);
          played++;
          stopTimer(); goHome();
        }
      }
    }
    return { issues, played };
  });
  check(`no raw markup or "undefined" on screen in any of ${leaks.played} question plays`, leaks.issues.length === 0, leaks.issues.slice(0, 3).join(' | '));

  // ---------------------------------------------------------------
  console.log('\nSound');
  check('audio unlocked after first click', (await page.evaluate(() => audioCtx && audioCtx.state)) === 'running');
  const count = () => page.evaluate(() => window.__osc.length);
  await page.locator('.mission-card').nth(0).click();
  let before = await count();
  // find a choice/tf question to hear the difference between right and wrong
  async function nextSimple() {
    while (!['choice', 'tf'].includes(await page.evaluate(() => currentRound[currentQ].type))) await answerQuestion(true);
  }
  await nextSimple();
  before = await count();
  await answerQuestion(true);
  const correctTones = (await count()) - before;
  check('a correct answer plays a sound', correctTones >= 2, correctTones);
  await nextSimple().catch(() => {});
  if (await page.locator('#question-area .q-card').count()) {
    before = await count();
    await answerQuestion(false);
    check('a wrong answer plays a sound', (await count()) - before >= 2);
  }
  // finish this mission, then test mute on the next one
  while (await page.locator('#game-screen').isVisible()) await answerQuestion(true);
  await backHome();
  await page.locator('#sound-btn').click();
  check('mute button switches to muted', (await page.locator('#sound-btn').innerText()).includes('🔇'));
  await page.locator('.mission-card').nth(1).click();
  await nextSimple();
  before = await count();
  await answerQuestion(true);
  check('muted: no sound is produced', (await count()) - before === 0);

  // ---------------------------------------------------------------
  console.log('\nJS errors');
  check('no JavaScript errors during the whole run', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) { console.log('Failed: ' + failures.join('; ')); process.exit(1); }
})().catch(e => { console.error('Smoke test crashed:', e); process.exit(2); });
