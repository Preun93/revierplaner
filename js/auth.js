/* Anmeldung für den Revierplaner.
 * Mit Supabase-Konfiguration (js/config.js): echte Anmeldung über Supabase Auth.
 *   Der Name wird intern zur E-Mail "<name>@revierplaner.app".
 * Ohne Konfiguration: einfache lokale Sperre über einen SHA-256-Hash. */
(function () {
  'use strict';

  const CREDENTIAL_HASH = 'd8736371035f80552c37f2cda9962ccf72e46b4ea11ad2543c2f0cf9ab7bbdf2';
  const SESSION_KEY = 'revierplaner.auth';
  const EMAIL_DOMAIN = 'revierplaner.app';

  const $ = (id) => document.getElementById(id);
  const cfg = window.REVIER_CONFIG || {};
  const cloud = cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

  // Wird von app.js genutzt
  window.revierAuth = {
    cloud,
    loggedIn: false,
    onLogin(cb) {
      if (this.loggedIn) cb();
      else document.addEventListener('revier:login', cb, { once: true });
    },
    async logout() {
      if (cloud) await cloud.auth.signOut();
      try {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      } catch (e) { /* ignorieren */ }
      location.reload();
    }
  };

  function unlock() {
    document.body.classList.remove('locked');
    $('login').hidden = true;
    window.revierAuth.loggedIn = true;
    document.dispatchEvent(new Event('revier:login'));
  }

  function showError(msg) {
    $('loginError').textContent = msg;
    $('loginError').hidden = false;
  }

  function showLogin() {
    $('login').hidden = false;
    $('loginName').focus();
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function localLogin(name, pass) {
    const hash = await sha256(name + ':' + pass);
    if (hash !== CREDENTIAL_HASH) return false;
    try { localStorage.setItem(SESSION_KEY, CREDENTIAL_HASH); } catch (e) { /* nur bis zum Neuladen */ }
    return true;
  }

  async function cloudLogin(name, pass) {
    const { error } = await cloud.auth.signInWithPassword({ email: `${name}@${EMAIL_DOMAIN}`, password: pass });
    if (!error) return true;
    if (/invalid/i.test(error.message)) return false;
    throw error;
  }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('loginName').value.trim().toLowerCase();
    const pass = $('loginPass').value;
    const btn = $('loginForm').querySelector('button[type="submit"]');
    $('loginError').hidden = true;
    btn.disabled = true;
    try {
      const ok = cloud ? await cloudLogin(name, pass) : await localLogin(name, pass);
      if (ok) {
        unlock();
      } else {
        showError('Name oder Passwort ist falsch.');
        $('loginPass').value = '';
        $('loginPass').focus();
      }
    } catch (err) {
      showError('Anmeldung fehlgeschlagen: ' + (err.message || 'keine Verbindung'));
    } finally {
      btn.disabled = false;
    }
  });

  // Bestehende Anmeldung wiederherstellen
  if (cloud) {
    cloud.auth.getSession().then(({ data }) => {
      if (data && data.session) unlock();
      else showLogin();
    }).catch(showLogin);
  } else {
    let token = null;
    try { token = localStorage.getItem(SESSION_KEY); } catch (e) { /* ignorieren */ }
    if (token === CREDENTIAL_HASH) unlock();
    else showLogin();
  }
})();
