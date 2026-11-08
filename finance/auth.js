// Winter Finance — access gate
// No password, hash or username is stored in this file or anywhere in this repository.
// The key is checked by the private Apps Script; this page only keeps what the visitor
// typed, for this browser tab, and sends it with each data request.
(function(){
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzXqNMR8ginRsz-k21oGbswPXMt1oIRZuQWNs33mdxCu2Am25DBDh6i_lSF8WXwlcP2fQ/exec';
  const SESSION_KEY = 'wf_auth';
  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours
  const origFetch = window.fetch.bind(window);
  let reloadOnLogin = false;

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

  // wf_pass holds the URL-encoded key, because the pages append it to the request URL as-is.
  function saveSession(encodedKey) {
    sessionStorage.setItem('wf_pass', encodedKey);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, ts: Date.now() }));
  }

  function isUnauthorized(text) { return /^\s*\/\/\s*unauthorized/i.test(text || ''); }

  // The Apps Script answers "// unauthorized" for a wrong key and the data otherwise.
  async function accepted(encodedKey) {
    const r = await origFetch(ENDPOINT + '?key=' + encodedKey);
    const t = await r.text();
    return !isUnauthorized(t) && /DATA\s*=/.test(t);
  }

  // If the key stops working (for example it was changed), drop the session and ask again.
  window.fetch = function(input, init) {
    const p = origFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.indexOf(ENDPOINT) === 0) {
        p.then(function(res) {
          return res.clone().text().then(function(t) {
            if (isUnauthorized(t)) { clearSession(); reloadOnLogin = true; if (!document.getElementById('wf-login')) showLogin(); }
          });
        }).catch(function(){});
      }
    } catch(e) {}
    return p;
  };

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
      </style>
      <div class="wf-box">
        <div class="wf-lock">🔐</div>
        <div class="wf-logo">WINTER</div>
        <div class="wf-sub">FAMILY FINANCE · PRIVATE</div>
        <div class="wf-field">
          <label class="wf-label" for="wf-pass">סיסמה</label>
          <input class="wf-input" id="wf-pass" type="password" placeholder="password" autocomplete="current-password" />
        </div>
        <button class="wf-btn" id="wf-go">כניסה</button>
        <div class="wf-error" id="wf-err">הסיסמה שגויה</div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.display = '';
    const input = document.getElementById('wf-pass');
    input.addEventListener('keydown', e => { if (e.key === 'Enter') wfLogin(); });
    document.getElementById('wf-go').addEventListener('click', wfLogin);
    input.focus();
  }

  async function wfLogin() {
    const input = document.getElementById('wf-pass');
    const btn = document.getElementById('wf-go');
    const err = document.getElementById('wf-err');
    const key = input.value;
    if (!key) return;
    btn.disabled = true;
    err.style.display = 'none';
    let ok = false, netFail = false;
    try { ok = await accepted(encodeURIComponent(key)); } catch(e) { netFail = true; }
    btn.disabled = false;
    if (ok) {
      saveSession(encodeURIComponent(key));
      document.getElementById('wf-login').remove();
      if (reloadOnLogin) { location.reload(); return; }
      document.dispatchEvent(new Event('wfLoggedIn'));
    } else {
      err.textContent = netFail ? 'שגיאת רשת, נסו שוב' : 'הסיסמה שגויה';
      err.style.display = 'block';
      input.value = '';
      input.focus();
    }
  }

  if (!checkSession()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showLogin);
    } else {
      showLogin();
    }
  }
})();
