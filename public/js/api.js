'use strict';
// ═══════════════════════════════════════════════
//  API  — Fetch wrapper → backend REST API
// ═══════════════════════════════════════════════

window.API = {

  async _fetch(method, path, body) {
    const token = Auth.token();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${CONFIG.API_URL}/api${path}`, opts);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return json;
  },

  get(path)         { return this._fetch('GET',  path, null); },
  post(path, body)  { return this._fetch('POST', path, body); },

  // ── Game ────────────────────────────────────
  placeBet(amount)  { return this.post('/game/bet',     { amount }); },
  cashOut()         { return this.post('/game/cashout', {}); },
  gameState()       { return this.get('/game/state'); },

  // ── Wallet ──────────────────────────────────
  balance()         { return this.get('/wallet/balance'); },
  history(limit=20) { return this.get(`/wallet/history?limit=${limit}`); },

  // ── M-Pesa ──────────────────────────────────
  deposit(phone, amount)  { return this.post('/mpesa/deposit',  { phone, amount }); },
  withdraw(phone, amount) { return this.post('/mpesa/withdraw', { phone, amount }); },
};
