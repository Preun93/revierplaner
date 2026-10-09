/* Einfache Zugangssperre für den Revierplaner.
 * Hinweis: Die Prüfung läuft im Browser (statische Seite auf GitHub Pages).
 * Es wird nur ein SHA-256-Hash von "name:passwort" hinterlegt, kein Klartext. */
(function () {
  'use strict';

  const CREDENTIAL_HASH = 'd8736371035f80552c37f2cda9962ccf72e46b4ea11ad2543c2f0cf9ab7bbdf2';
  const SESSION_KEY = 'revierplaner.auth';

  const $ = (id) => document.getElementById(id);

  function storedToken() {
    try { return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; }
  }
  function storeToken(remember) {
    try {
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, CREDENTIAL_HASH);
    } catch (e) { /* ohne Speicher bleibt der Login nur bis zum Neuladen */ }
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function unlock() {
    document.body.classList.remove('locked');
    $('login').hidden = true;
  }

  window.revierLogout = function () {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignorieren */ }
    location.reload();
  };

  if (storedToken() === CREDENTIAL_HASH) {
    unlock();
    return;
  }

  $('login').hidden = false;
  $('loginName').focus();

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('loginName').value.trim().toLowerCase();
    const pass = $('loginPass').value;
    $('loginError').hidden = true;
    let hash = '';
    try {
      hash = await sha256(name + ':' + pass);
    } catch (err) {
      $('loginError').textContent = 'Anmeldung in diesem Browser nicht möglich (nur über https).';
      $('loginError').hidden = false;
      return;
    }
    if (hash === CREDENTIAL_HASH) {
      storeToken($('loginRemember').checked);
      unlock();
    } else {
      $('loginError').textContent = 'Name oder Passwort ist falsch.';
      $('loginError').hidden = false;
      $('loginPass').value = '';
      $('loginPass').focus();
    }
  });
})();
