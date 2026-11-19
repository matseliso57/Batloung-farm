'use strict';

const TOKEN_KEY = 'batloung_token';
const ADMIN_KEY = 'batloung_admin';

// already signed in? go straight to the app
try { if (localStorage.getItem(TOKEN_KEY)) location.replace('/'); } catch (e) { /* storage blocked */ }

const form = document.getElementById('login-form');
const errBox = document.getElementById('login-error');
const btn = document.getElementById('login-btn');

document.getElementById('show').addEventListener('change', (e) => {
  document.getElementById('password').type = e.target.checked ? 'text' : 'password';
});

function showError(message) {
  errBox.textContent = message;
  errBox.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.hidden = true;

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  if (!username || !password) return showError('Enter your username and password.');

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  try {
    let res;
    try {
      res = await fetch((window.API_BASE || '') + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
    } catch (err) {
      throw new Error('Cannot reach the back end. Start it in another terminal with: npm run dev');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `Sign in failed (${res.status})`);

    try {
      localStorage.setItem(TOKEN_KEY, json.token);
      localStorage.setItem(ADMIN_KEY, JSON.stringify(json.admin));
    } catch (err) {
      throw new Error('Your browser is blocking storage, so the login cannot be remembered. Allow site data and try again.');
    }
    location.replace('/');
  } catch (err) {
    showError(err.message);
    document.getElementById('password').select();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});
