// Winter Finance — access gate: email + one-time code. No password exists.
// Step 1: the visitor enters an email; if it is on the allowed list the Apps Script emails a code.
// Step 2: the visitor enters the code; the Apps Script returns a session token.
// The token is kept for this browser tab only and sent with each data request.
// Nothing secret is stored in this file or anywhere in this repository.
(function(){
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycby1CW3nl23yASIfz3BKF913dsGP28u7Salnk_KgmetxBctRpYo8NlCpDwAi-cNV_6PwPA/exec';
  const SESSION_KEY = 'wf_auth';
  const SESSION_TTL = 6 * 60 * 60 * 1000; // matches the server session length (6 hours)
  const origFetch = window.fetch.bind(window);
  let reloadOnLogin = false;
  let pendingEmail = '';

  function checkSession() {
    try {
      if (!sessionStorage.getItem('wf_pass')) return false;
      const s = sessionStorage.getItem(SESSION_KEY);
      if (!s) return false;
      const data = JSON.parse(s);
      if (Date.now() - data.ts > SESSION_TTL) { clearSession(); return false; }
      return data.ok === true;
    } catch(e) { return false; }
  }

  function clearSession() {
    try { sessionStorage.removeItem('wf_pass'); sessionStorage.removeItem(SESSION_KEY); } catch(e) {}
  }

  // "wf_pass" holds the session token; the pages append it to data requests as ?key=
  function saveSession(token) {
    sessionStorage.setItem('wf_pass', token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, ts: Date.now() }));
  }

  function isUnauthorized(text) { return /^\s*\/\/\s*unauthorized/i.test(text || ''); }

  async function api(params) {
    const q = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
    const r = await origFetch(ENDPOINT + '?' + q);
    return r.json();
  }

  // If the session stops working (expired or revoked), drop it and ask again.
  window.fetch = function(input, init) {
    const p = origFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.indexOf(ENDPOINT) === 0 && url.indexOf('action=') === -1) {
        p.then(function(res) {
          return res.clone().text().then(function(t) {
            if (isUnauthorized(t)) { clearSession(); reloadOnLogin = true; if (!document.getElementById('wf-login')) showLogin(); }
          });
        }).catch(function(){});
      }
    } catch(e) {}
    return p;
  };

  function box(inner) { return '<div class="wf-box"><div class="wf-lock">🔐</div><div class="wf-logo">WINTER</div><div class="wf-sub">FAMILY FINANCE · PRIVATE</div>' + inner + '</div>'; }

  function render(html) {
    document.querySelector('#wf-login .wf-box').outerHTML = html;
  }

  function showLogin() {
    document.body.style.display = 'none';
    const overlay = document.createElement('div');
    overlay.id = 'wf-login';
    overlay.innerHTML = `
      <style>
        #wf-login {
          position: fixed; inset: 0; background: #0a0a0a;
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; font-family: 'Space Grotesk', -apple-system, sans-serif;
        }
        .wf-box {
          background: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 16px;
          padding: 40px; width: 100%; max-width: 380px; text-align: center;
        }
        .wf-logo {
          font-family: 'Bebas Neue', monospace; font-size: 2.2rem;
          letter-spacing: 5px; color: #ff6b35; margin-bottom: 6px;
        }
        .wf-sub {
          font-family: 'IBM Plex Mono', monospace; font-size: .7rem;
          color: #888; letter-spacing: 2px; margin-bottom: 32px;
        }
        .wf-field {
          margin-bottom: 14px; text-align: right;
        }
        .wf-label {
          display: block; font-size: .72rem; font-family: 'IBM Plex Mono', monospace;
          color: #888; letter-spacing: 1px; text-transform: uppercase;
          margin-bottom: 6px; text-align: right;
        }
        .wf-input {
          width: 100%; background: #111; border: 1px solid #333; border-radius: 8px;
          padding: 11px 14px; color: #f0efe8; font-size: .9rem; font-family: inherit;
          direction: ltr; text-align: left; outline: none; transition: border-color .15s;
        }
        .wf-input:focus { border-color: #ff6b35; }
        .wf-btn {
          width: 100%; background: #ff6b35; color: #000; border: none;
          border-radius: 8px; padding: 13px; font-size: .9rem; font-weight: 700;
          font-family: inherit; cursor: pointer; letter-spacing: 1px;
          margin-top: 8px; transition: opacity .15s;
        }
        .wf-btn:hover { opacity: .85; }
        .wf-btn:active { opacity: .7; }
        .wf-error {
          background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3);
          border-radius: 6px; padding: 8px 12px; font-size: .78rem;
          color: #f87171; margin-top: 12px; display: none; font-family: 'IBM Plex Mono', monospace;
        }
        .wf-lock { font-size: 2rem; margin-bottom: 16px; }
        .wf-hint { font-size: .78rem; color: #888; margin: 4px 0 10px; line-height: 1.5; }
        .wf-link { background: none; border: none; color: #888; font-size: .78rem; cursor: pointer; margin-top: 14px; text-decoration: underline; font-family: inherit; }
        .wf-code { letter-spacing: 8px; text-align: center !important; font-size: 1.3rem; }
      </style>
      ${box('')}`;
    document.body.appendChild(overlay);
    document.body.style.display = '';
    stepEmail();
  }

  function stepEmail(msg) {
    let saved = '';
    try { saved = localStorage.getItem('wf_email') || ''; } catch(e) {}
    render(box(`
        <div class="wf-field">
          <label class="wf-label" for="wf-email">אימייל</label>
          <input class="wf-input" id="wf-email" type="email" inputmode="email" placeholder="you@example.com" autocomplete="email" />
        </div>
        <button class="wf-btn" id="wf-send">שלחו לי קוד</button>
        <div class="wf-error" id="wf-err" style="display:${msg ? 'block' : 'none'}">${msg || ''}</div>`));
    const input = document.getElementById('wf-email');
    input.value = saved;   // set as a value, never as markup
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendCode(); });
    document.getElementById('wf-send').addEventListener('click', sendCode);
    input.focus();
  }

  function stepCode(msg) {
    render(box(`
        <div class="wf-hint">אם הכתובת מורשית, נשלח אליה קוד בן 6 ספרות. הקוד תקף ל-10 דקות.</div>
        <div class="wf-field">
          <label class="wf-label" for="wf-code">קוד</label>
          <input class="wf-input wf-code" id="wf-code" type="text" inputmode="numeric" maxlength="6" placeholder="······" autocomplete="one-time-code" />
        </div>
        <button class="wf-btn" id="wf-go">כניסה</button>
        <div class="wf-error" id="wf-err" style="display:${msg ? 'block' : 'none'}">${msg || ''}</div>
        <button class="wf-link" id="wf-back">שליחה מחדש / אימייל אחר</button>`));
    const input = document.getElementById('wf-code');
    input.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
    document.getElementById('wf-go').addEventListener('click', verify);
    document.getElementById('wf-back').addEventListener('click', () => stepEmail());
    input.focus();
  }

  async function sendCode() {
    const email = document.getElementById('wf-email').value.trim();
    const btn = document.getElementById('wf-send');
    if (!email) return;
    btn.disabled = true;
    try {
      const r = await api({ action: 'request', email });
      if (r.ok) {
        pendingEmail = email;
        try { localStorage.setItem('wf_email', email); } catch(e) {}
        stepCode();
      } else {
        stepEmail(r.error === 'too_many' ? 'יותר מדי בקשות. נסו שוב בעוד כרבע שעה.' : r.error === 'bad_email' ? 'כתובת אימייל לא תקינה' : 'השרת עסוק, נסו שוב');
      }
    } catch(e) { stepEmail('שגיאת רשת, נסו שוב'); }
  }

  async function verify() {
    const input = document.getElementById('wf-code');
    const btn = document.getElementById('wf-go');
    const code = input.value.replace(/\s/g, '');
    if (!/^\d{6}$/.test(code)) { stepCode('יש להזין 6 ספרות'); return; }
    btn.disabled = true;
    try {
      const r = await api({ action: 'verify', email: pendingEmail, code });
      if (r.ok && r.token) {
        saveSession(r.token);
        document.getElementById('wf-login').remove();
        if (reloadOnLogin) { location.reload(); return; }
        document.dispatchEvent(new Event('wfLoggedIn'));
      } else {
        stepCode('הקוד שגוי או שפג תוקפו');
      }
    } catch(e) { stepCode('שגיאת רשת, נסו שוב'); }
  }

  if (!checkSession()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showLogin);
    } else {
      showLogin();
    }
  }
})();
