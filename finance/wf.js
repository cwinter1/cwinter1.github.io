/* Winter Finance shared helpers: Hebrew names and one colour per category, number formats, small statistics,
   inline SVG sparklines, the shared navigation and the data loader. No data lives here. */
(function () {
  var DATA_URL = 'https://script.google.com/macros/s/AKfycbyRXr2Bk6uhUoo_WaWg0YY0KiLPK_7r0wFBuQcM-EghFmqnkFpztTvCRj-Y2i2AQrlEQA/exec';

  // [Hebrew name, colour, group]. Colours are mid-tones that read on both the dark and the light theme.
  var CAT = {
    mortgage:        ['משכנתא', '#d65a52', 'fixed'],
    loans:           ['הלוואות', '#e6845f', 'fixed'],
    utilities:       ['חשבונות הבית', '#d9a93b', 'fixed'],
    insurance:       ['ביטוחים', '#c78bd1', 'fixed'],
    building_fee:    ['ועד בית ועירייה', '#9aa3ad', 'fixed'],
    school:          ['בית ספר', '#5fb0a5', 'fixed'],
    camps:           ['קייטנות', '#c9a14a', 'fixed'],
    card_fee:        ['עמלות כרטיס', '#8b95a1', 'fixed'],
    interest:        ['ריבית מינוס', '#b86a6a', 'fixed'],
    groceries:       ['סופר ומכולת', '#3fb88f', 'living'],
    health:          ['בריאות', '#3aa9b5', 'living'],
    fuel:            ['דלק', '#6f86c9', 'living'],
    transport:       ['תחבורה ורכב', '#7a8fa6', 'living'],
    education:       ['שיעורים פרטיים', '#5b9bd5', 'living'],
    kids_activities: ['פעילויות ילדים', '#5c8df0', 'living'],
    clothing:        ['ביגוד והנעלה', '#a08df0', 'flex'],
    shopping:        ['קניות ובית', '#d77fb4', 'flex'],
    restaurants:     ['מסעדות ובתי קפה', '#e3a63f', 'flex'],
    entertainment:   ['בילויים', '#e58fa0', 'flex'],
    subscriptions:   ['מנויים', '#c9a0dc', 'flex'],
    transfers:       ['העברות לאנשים', '#8f9bb3', 'flex'],
    other:           ['אחר', '#9b9486', 'flex'],
    cash:            ['מזומן', '#a39f6a', 'flex'],
    savings:         ['חיסכון והשקעות', '#4fae6a', 'flex'],
    travel:          ['נסיעות וחופשות', '#2fb3d1', 'travel'],
    unclassified:    ['לא מסווג', '#777f89', 'flex']
  };
  var GROUPS = { fixed: 'הוצאות קבועות', living: 'הוצאות משתנות: מחיה', flex: 'הוצאות משתנות: גמישות', travel: 'נסיעות' };
  var HEB_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  var HEB_LONG = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  function name(c) { return (CAT[c] || [c])[0]; }
  function color(c) { return (CAT[c] || [0, '#8b95a1'])[1]; }
  function group(c) { return (CAT[c] || [0, 0, 'flex'])[2]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }

  function n0(x) { return Math.round(x).toLocaleString('en-US'); }
  function ils(x, o) {                       // "₪12,450" / "−₪3,100" (always left-to-right inside its own box)
    o = o || {};
    var neg = x < 0, v = n0(Math.abs(x));
    var s = '₪' + v;
    if (neg) s = '−' + s; else if (o.plus && x > 0) s = '+' + s;
    return '<span class="num">' + s + '</span>';
  }
  function ilsText(x) { return (x < 0 ? '−' : '') + '₪' + n0(Math.abs(x)); }
  function k(x, d) {                         // "₪83.8k"
    d = d == null ? 1 : d;
    return (x < 0 ? '−' : '') + '₪' + (Math.abs(x) / 1000).toFixed(d) + 'k';
  }
  function pct(x, d) { return (x >= 0 ? '' : '−') + Math.abs(x).toFixed(d == null ? 0 : d) + '%'; }
  function mShort(ym) { var m = +ym.slice(5, 7); return HEB_SHORT[m - 1] + ' ' + ym.slice(2, 4); }
  function mLong(ym) { var m = +ym.slice(5, 7); return HEB_LONG[m - 1] + ' ' + ym.slice(0, 4); }

  // Current monthly rate of a fixed item (see recurring in the data): the latest charge; a bimonthly bill is halved;
  // a yearly item is its yearly sum / 12; a seasonal item is the average of its last four charges.
  function rate(it, ms) {
    var all = ms.map(function (m) { return (it.m && it.m[m]) || 0; }), n = all.filter(function (x) { return x > 0; });
    if (!n.length) return 0;
    var s = n.reduce(function (p, x) { return p + x; }, 0);
    if (it.annual) return (it.yearly || s) / 12;
    var r = it.variable ? n.slice(-4).reduce(function (p, x) { return p + x; }, 0) / Math.min(4, n.length) : n[n.length - 1];
    return r / (it.period || 1);
  }

  // ── click-through: the individual charges behind a number (private data written by the daily sync) ──
  function charges(cat, fromYm, toYm) {
    var D = window.DATA || {}, to = toYm || fromYm;
    return (D.charges || []).filter(function (c) { return c[1] === cat && c[0].slice(0, 7) >= fromYm && c[0].slice(0, 7) <= to; });
  }
  // the list for one category in one month: every charge (name, amount, date), biggest first; for months before the sync kept
  // individual charges, the top businesses of that month instead
  function drillHTML(cat, ym) {
    var D = window.DATA || {}, list = charges(cat, ym).sort(function (a, b) { return Math.abs(b[3]) - Math.abs(a[3]); });
    var head = '<div style="font-size:.78rem;color:var(--m);margin-bottom:6px">' + esc(name(cat)) + ' · ' + mLong(ym) + '</div>', body;
    if (list.length) {
      var tot = list.reduce(function (s, c) { return s + c[3]; }, 0);
      body = '<table class="tb">' + list.map(function (c) {
        return '<tr><td class="n" style="white-space:nowrap;color:var(--m)">' + c[0].slice(8) + '/' + c[0].slice(5, 7) + '</td><td>' + esc(c[2]) + '</td><td class="n">' + ilsText(c[3]) + '</td></tr>';
      }).join('') + '<tr style="font-weight:700"><td></td><td>' + list.length + ' עסקאות</td><td class="n">' + ilsText(tot) + '</td></tr></table>';
    } else {
      var top = (((D.month_detail || {})[ym] || {}).top || []).filter(function (t) { return t.cat === cat; });
      body = top.length ? '<table class="tb">' + top.map(function (t) { return '<tr><td>' + esc(t.m) + '</td><td class="n">' + t.n + ' פעמים</td><td class="n">' + ilsText(t.amt) + '</td></tr>'; }).join('') +
        '</table><div style="font-size:.72rem;color:var(--m);margin-top:6px">לחודש הזה יש רק העסקים הגדולים. פירוט כל העסקאות קיים מיוני 2026.</div>'
        : '<div class="empty">אין פירוט עסקאות לחודש הזה</div>';
    }
    return head + '<div style="max-height:340px;overflow-y:auto">' + body + '</div>';
  }

  // the same list for one category over a date range (a week): from s to e inclusive (YYYY-MM-DD)
  function drillRangeHTML(cat, s, e) {
    var list = ((window.DATA || {}).charges || []).filter(function (c) { return c[1] === cat && c[0] >= s && c[0] <= e; }).sort(function (a, b) { return Math.abs(b[3]) - Math.abs(a[3]); });
    var head = '<div style="font-size:.78rem;color:var(--m);margin-bottom:6px">' + esc(name(cat)) + ' · ' + s.slice(8) + '/' + s.slice(5, 7) + '–' + e.slice(8) + '/' + e.slice(5, 7) + '</div>';
    if (!list.length) return head + '<div class="empty">אין עסקאות בקטגוריה הזו בשבוע הזה, או שאין פירוט לתקופה (קיים מיוני 2026)</div>';
    var tot = list.reduce(function (t, c) { return t + c[3]; }, 0);
    return head + '<div style="max-height:340px;overflow-y:auto"><table class="tb">' + list.map(function (c) {
      return '<tr><td class="n" style="white-space:nowrap;color:var(--m)">' + c[0].slice(8) + '/' + c[0].slice(5, 7) + '</td><td>' + esc(c[2]) + '</td><td class="n">' + ilsText(c[3]) + '</td></tr>';
    }).join('') + '<tr style="font-weight:700"><td></td><td>' + list.length + ' עסקאות</td><td class="n">' + ilsText(tot) + '</td></tr></table></div>';
  }

  // ── overdraft plan: any number of phases. Before the first phase: the first. After the last, or in a gap: the latest phase that has started.
  function phaseOf(plan, ym) {
    var ph = ((plan && plan.phases) || []).slice().sort(function (x, y) { return x.from < y.from ? -1 : 1; });
    if (!ph.length) return null;
    for (var i = 0; i < ph.length; i++) if (ym >= ph[i].from && ym <= ph[i].to) return ph[i];
    var started = ph.filter(function (p) { return p.from <= ym; });
    return started.length ? started[started.length - 1] : ph[0];
  }
  // a category's cap in a phase: p<id>, else the nearest earlier phase's value
  function capIn(c, id) {
    for (var i = +id; i >= 1; i--) if (c['p' + i] != null) return c['p' + i];
    return 0;
  }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function avg(a) { return a.length ? sum(a) / a.length : 0; }
  function median(a) { if (!a.length) return 0; var b = a.slice().sort(function (x, y) { return x - y; }), i = b.length >> 1; return b.length % 2 ? b[i] : (b[i - 1] + b[i]) / 2; }
  function slope(a) {                         // least-squares slope per step
    var n = a.length; if (n < 3) return 0;
    var mx = (n - 1) / 2, my = avg(a), num = 0, den = 0;
    for (var i = 0; i < n; i++) { num += (i - mx) * (a[i] - my); den += (i - mx) * (i - mx); }
    return den ? num / den : 0;
  }

  function spark(vals, col, o) {              // tiny inline chart, no library
    o = o || {}; var w = o.w || 120, h = o.h || 30, n = vals.length;
    if (n < 2) return '';
    var mx = Math.max.apply(null, vals.concat([1])), mn = Math.min.apply(null, vals.concat([0]));
    var rng = (mx - mn) || 1, pts = vals.map(function (v, i) {
      return (i * (w - 4) / (n - 1) + 2).toFixed(1) + ',' + (h - 3 - (v - mn) / rng * (h - 8)).toFixed(1);
    });
    var last = pts[n - 1].split(',');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + pts.join(' ') + '"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.6" fill="' + col + '"/></svg>';
  }

  // The months that are complete enough to compare totals: full bank + card picture.
  function months() { return (window.DATA && DATA.history && DATA.history.months) || []; }
  function solid() { return months().filter(function (m) { return m.q === 'full'; }); }

  var NAV = [['index.html', 'תמונת מצב'], ['month.html', 'חודש'], ['week.html', 'שבוע'], ['trends.html', 'מגמות'],
             ['overdraft.html', 'יציאה מהמינוס'], ['budget.html', 'תקציב'], ['budget-monthly.html', 'תשלומים קבועים']];
  function nav(active) {
    var el = document.getElementById('wfnav'); if (!el) return;
    el.innerHTML = '<span class="nb">כספים</span>' + NAV.map(function (n) {
      return '<a class="nl' + (n[0] === active ? ' act' : '') + '" href="' + n[0] + '">' + n[1] + '</a>';
    }).join('') + '<span class="nsp"></span><span class="nst" id="wfstamp"></span><button class="nrf" id="wfrefresh" title="רענון נתונים" aria-label="רענון נתונים">↻</button>';
    var b = document.getElementById('wfrefresh'); if (b) b.onclick = function () { b.classList.add('spin'); location.reload(); };
  }

  // A visible message under the navigation: stale data, missing blocks, or a failed load (with a retry button).
  function banner(msg, retry) {
    var el = document.getElementById('wfbanner');
    if (!el) {
      el = document.createElement('div'); el.id = 'wfbanner'; el.className = 'wfb';
      var nv = document.getElementById('wfnav');
      if (nv && nv.parentNode) nv.parentNode.insertBefore(el, nv.nextSibling); else document.body.insertBefore(el, document.body.firstChild);
    }
    el.innerHTML = '<span>' + esc(msg) + '</span>' + (retry ? ' <button onclick="location.reload()">נסו שוב</button>' : '');
    el.hidden = false;
  }

  var REQUIRED = ['history', 'weeks', 'live', 'od_plan', 'position', 'recurring'];   // blocks every page may rely on
  var AUTO_MS = 15 * 60 * 1000;                                                      // visible pages reload themselves this often

  function stampAndChecks(D) {
    var live = D.live || {}, upd = live.as_of || (D.meta && D.meta.updated) || '';
    var st = document.getElementById('wfstamp');
    if (st && upd) st.textContent = 'נתונים עד ' + upd.slice(8, 10) + '.' + upd.slice(5, 7);
    var miss = REQUIRED.filter(function (k) { return !D[k]; });
    if (miss.length) { banner('בקובץ הנתונים חסרים חלקים (' + miss.join(', ') + '), ולכן חלק מהעמודים יהיו ריקים. הריצה הבאה תתקן.'); return; }
    var dt = live.data_through || upd;
    if (dt) { var age = (Date.now() - new Date(dt + 'T12:00:00').getTime()) / 86400000; if (age > 3.5) banner('הנתונים לא התעדכנו מאז ' + dt.slice(8, 10) + '.' + dt.slice(5, 7) + '. ייתכן שהריצה היומית לא רצה.'); }
  }

  function boot(render) {                     // same login hand-off as the older pages (auth.js)
    var t0 = Date.now();
    function load() {
      fetch(DATA_URL + '?key=' + encodeURIComponent(sessionStorage.getItem('wf_pass') || '') + '&_=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.text(); })
        .then(function (js) {
          if (/^\s*\/\/\s*unauthorized/i.test(js)) return;                       // auth.js shows the login box and reloads after it
          if (/^\s*\/\/\s*error/i.test(js)) { banner('השרת לא מצא קובץ נתונים תקין.', true); return; }
          wfRunData(js);
          stampAndChecks(window.DATA);
          try { render(window.DATA); }
          catch (e) { console.error('render failed', e); banner('שגיאה בהצגת העמוד. הנתונים נטענו, אבל משהו בהם לא כצפוי.', true); }
        })
        .catch(function (e) { console.error('load failed', e); banner('לא הצלחנו לטעון את הנתונים.', true); });
    }
    if (sessionStorage.getItem('wf_pass')) load(); else document.addEventListener('wfLoggedIn', load);
    setInterval(function () { if (!document.hidden && Date.now() - t0 > AUTO_MS) location.reload(); }, 60000);
  }

  function chartDefaults() {
    if (!window.Chart) return;
    var cs = getComputedStyle(document.documentElement);
    Chart.defaults.font.family = "'Heebo', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = cs.getPropertyValue('--m').trim() || '#a2afbd';
    Chart.defaults.borderColor = cs.getPropertyValue('--bo').trim() || '#2b3440';
  }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  window.WF = { charges: charges, drillHTML: drillHTML, drillRangeHTML: drillRangeHTML, phaseOf: phaseOf, capIn: capIn, CAT: CAT, GROUPS: GROUPS, name: name, color: color, group: group, esc: esc, ils: ils, ilsText: ilsText, k: k, pct: pct,
    mShort: mShort, mLong: mLong, sum: sum, avg: avg, median: median, slope: slope, spark: spark, months: months, solid: solid,
    nav: nav, boot: boot, banner: banner, rate: rate, chartDefaults: chartDefaults, css: css, n0: n0 };
})();
