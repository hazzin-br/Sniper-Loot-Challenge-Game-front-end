'use strict';
// ═══════════════════════════════════════════════
//  UI  — Screen management + toasts
// ═══════════════════════════════════════════════

window.UI = {

  // ── Screen switching ─────────────────────────
  showScreen(id) {
    ['s-login', 's-username', 's-mpesa', 's-game'].forEach(s => {
      const el = document.getElementById(s);
      if (!el) return;
      if (s === id) {
        el.classList.remove('hidden');
        if (s === 's-game') el.style.display = 'flex';
      } else {
        el.classList.add('hidden');
        if (s === 's-game') el.style.display = 'none';
      }
    });
  },

  // ── Auth state handlers ───────────────────────
  async onSignedIn(profile) {
    if (!profile.username) {
      // First time — ask for username
      UI.showScreen('s-username');
      document.getElementById('username-input').focus();
    } else {
      await UI._enterGame(profile);
    }
  },

  onSignedOut() {
    UI.showScreen('s-login');
  },

  async _enterGame(profile) {
    UI.showScreen('s-game');
    await Game.init(profile);
    Socket.connect();
  },

  // ── Toast notifications ───────────────────────
  showToast(msg, type = 'ok') {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className   = `toast toast-${type} toast-show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('toast-show'), 3000);
  },

  // ── M-Pesa modal ─────────────────────────────
  openMpesa() {
    Mpesa.switchTab('deposit');
    UI.showScreen('s-mpesa');
  },

  closeMpesa() {
    const game = document.getElementById('s-game');
    if (game && !game.classList.contains('hidden')) {
      UI.showScreen('s-game');
    } else {
      UI.showScreen('s-login');
    }
  },
};

// ════════════════════════════════════════════════
//  APP INIT — runs on DOMContentLoaded
// ════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // ── Google sign-in button ─────────────────────
  document.getElementById('google-signin-btn').addEventListener('click', async () => {
    try {
      await Auth.signInWithGoogle();
      // Page will redirect to Google then back — onAuthStateChange fires on return
    } catch (err) {
      UI.showToast('Sign-in failed: ' + err.message, 'err');
    }
  });

  // ── Sign-out button ───────────────────────────
  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => Auth.signOut());
  }

  // ── Username form (first time) ────────────────
  document.getElementById('username-submit').addEventListener('click', async () => {
    const val = document.getElementById('username-input').value.trim();
    if (!val || val.length < 3) {
      document.getElementById('username-err').textContent = 'Must be at least 3 characters';
      return;
    }
    try {
      const profile = await Auth.setUsername(val);
      await UI._enterGame(profile);
    } catch (err) {
      document.getElementById('username-err').textContent = err.message;
    }
  });

  document.getElementById('username-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('username-submit').click();
  });

  // ── Deposit button on login screen ───────────
  document.getElementById('open-deposit-btn')?.addEventListener('click', () => {
    if (!Auth.token()) {
      UI.showToast('Sign in first', 'err');
      return;
    }
    UI.openMpesa();
  });

  // ── Init Mpesa modal listeners ────────────────
  Mpesa.init();

  // ── Restore session ───────────────────────────
  const profile = await Auth.init();
  if (profile) {
    await UI.onSignedIn(profile);
  } else {
    UI.showScreen('s-login');
  }
});
