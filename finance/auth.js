// Winter Finance — Authentication
// User: Chris | Password: winterfinance2026
(function(){
  const USER = 'chris';
  const PASS_HASH = '7fdab3f7'; // sha256 of winterfinance2026
  const SESSION_KEY = 'wf_auth';
  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

  // Simple hash function (not cryptographic, but sufficient for static site)
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  const EXPECTED = simpleHash('winterfinance2026');

  function checkSession() {
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      if (!s) return false;
      const data = JSON.parse(s);
      if (Date.now() - data.ts > SESSION_TTL) { sessionStorage.removeItem(SESSION_KEY); return false; }
      return data.ok === true;
    } catch(e) { return false; }
  }

  function saveSession() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, ts: Date.now() }));
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
      </style>
      <div class="wf-box">
        <div class="wf-lock">🔐</div>
        <div class="wf-logo">WINTER</div>
        <div class="wf-sub">FAMILY FINANCE · PRIVATE</div>
        <div class="wf-field">
          <label class="wf-label" for="wf-user">משתמש</label>
          <input class="wf-input" id="wf-user" type="text" placeholder="username" autocomplete="username" />
        </div>
        <div class="wf-field">
          <label class="wf-label" for="wf-pass">סיסמה</label>
          <input class="wf-input" id="wf-pass" type="password" placeholder="password" autocomplete="current-password" />
        </div>
        <button class="wf-btn" onclick="wfLogin()">כניסה</button>
        <div class="wf-error" id="wf-err">שם משתמש או סיסמה שגויים</div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.display = '';
    document.getElementById('wf-pass').addEventListener('keydown', e => { if(e.key==='Enter') wfLogin(); });
    document.getElementById('wf-user').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('wf-pass').focus(); });
  }

  window.wfLogin = function() {
    const user = document.getElementById('wf-user').value.trim().toLowerCase();
    const pass = document.getElementById('wf-pass').value;
    if (user === USER && simpleHash(pass) === EXPECTED) {
      saveSession();
      document.getElementById('wf-login').remove();
    } else {
      document.getElementById('wf-err').style.display = 'block';
      document.getElementById('wf-pass').value = '';
      document.getElementById('wf-pass').focus();
    }
  };

  if (!checkSession()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showLogin);
    } else {
      showLogin();
    }
  }
})();
