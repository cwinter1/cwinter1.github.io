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
const MISSIONS = 4;
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
        const key = q.type === 'flipcards' ? q.cards[0].front : (q.type === 'order' || q.type === 'sort') ? q.q + JSON.stringify(q.items) : q.q;
        if (seen.has(key)) issues.push('duplicate question: ' + w);
        seen.add(key);
        if (q.type !== 'flipcards' && !q.exp) issues.push('missing explanation: ' + w);
        if (q.type === 'choice') {
          if (!(q.ans >= 0 && q.ans < q.opts.length)) issues.push('answer index out of range: ' + w);
          if (new Set(q.opts).size !== q.opts.length) issues.push('duplicate options: ' + w);
        } else if (q.type === 'tf') {
          if (typeof q.ans !== 'boolean') issues.push('tf answer not boolean: ' + w);
        } else if (q.type === 'order') {
          if (new Set(q.items).size !== q.items.length) issues.push('duplicate order items: ' + w);
        } else if (q.type === 'sort') {
          if (!q.items.some(x => x.bucket === 0) || !q.items.some(x => x.bucket === 1)) issues.push('sort has an empty bucket: ' + w);
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
  const missionWith = { choice: 0, tf: 0, order: 0, sort: 0 };
  for (const type of ['choice', 'tf', 'order', 'sort']) {
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
    // digits: the Arabic-Indic digit string must equal the number
    NUM.forEach(([v, dig, word]) => {
      const n = [...dig].map(c => c.codePointAt(0) - 0x660).join('');
      if (Number(n) !== v) issues.push(`digit ${dig} is not ${v}`);
      if (!word.trim()) issues.push('empty word for ' + v);
    });
    // 11-19 = unit word + " عَشَر", tens end in ون
    const unitWord = v => NUM.find(x => x[0] === v)[2];
    for (let v = 11; v <= 19; v++) {
      const w = NUM.find(x => x[0] === v)[2];
      if (!w.endsWith('عَشَر')) issues.push(`${v} does not end with عَشَر`);
      if (base(w.replace(/\s*عَشَر$/, '')).replace(/ة$/, '') !== base(unitWord(v - 10)).replace(/ة$/, '').replace(/ان$/, '')
          && v !== 11 && v !== 12) issues.push(`${v}: unit part does not match ${v - 10}`);
    }
    for (let v = 20; v <= 90; v += 10) if (!base(NUM.find(x => x[0] === v)[2]).endsWith('ون')) issues.push(`${v} does not end in ون`);
    // every number is unique
    if (new Set(NUM.map(x => x[2])).size !== NUM.length) issues.push('two numbers share the same word');
    if (new Set(NUM.map(x => x[3])).size !== NUM.length) issues.push('two numbers share the same Hebrew sound');
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
    // letters: names and dots are consistent
    if (new Set(LET.map(l => l.name)).size !== LET.length) issues.push('two letters share a name');
    return issues;
  });
  check('digits, number words, "my" forms and letter-in-word claims are consistent', content.length === 0, content.slice(0, 3).join(' | '));

  // ---------------------------------------------------------------
  console.log('\nSound');
  check('audio unlocked after first click', (await page.evaluate(() => audioCtx && audioCtx.state)) === 'running');
  const count = () => page.evaluate(() => window.__osc.length);
  await page.locator('.mission-card').nth(2).click();
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
  await page.locator('.mission-card').nth(3).click();
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
