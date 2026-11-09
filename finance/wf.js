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
             ['overdraft.html', 'יציאה מהמינוס'], ['budget.html', 'תקציב'], ['budget-monthly.html', 'תקציב חודשי']];
  function nav(active) {
    var el = document.getElementById('wfnav'); if (!el) return;
    el.innerHTML = '<span class="nb">כספים</span>' + NAV.map(function (n) {
      return '<a class="nl' + (n[0] === active ? ' act' : '') + '" href="' + n[0] + '">' + n[1] + '</a>';
    }).join('');
  }

  function boot(render) {                     // same login hand-off as the older pages (auth.js)
    function load() {
      fetch(DATA_URL + '?key=' + (sessionStorage.getItem('wf_pass') || ''))
        .then(function (r) { return r.text(); })
        .then(function (js) { wfRunData(js); render(window.DATA); })
        .catch(function (e) { console.error('load failed', e); });
    }
    if (sessionStorage.getItem('wf_pass')) load(); else document.addEventListener('wfLoggedIn', load);
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

  window.WF = { CAT: CAT, GROUPS: GROUPS, name: name, color: color, group: group, esc: esc, ils: ils, ilsText: ilsText, k: k, pct: pct,
    mShort: mShort, mLong: mLong, sum: sum, avg: avg, median: median, slope: slope, spark: spark, months: months, solid: solid,
    nav: nav, boot: boot, chartDefaults: chartDefaults, css: css, n0: n0 };
})();
