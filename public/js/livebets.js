'use strict';
// ═══════════════════════════════════════════════
//  LIVE BETS  — Simulated + real player feed
//  Real cashouts come from backend WebSocket.
//  Simulated bots fill the rest of the table.
// ═══════════════════════════════════════════════

window.LiveBets = (() => {

  const FAKE_NAMES = [
    'Shadow_Ke','Nairobi_G','MtKenya_X','Mombasa99','Kisumu_P',
    'LiquidGold','RedScope','Kibet_254','Wanjiku_W','SnipeKing',
    'CashOut_K','Odhiambo','Kariuki_G','QuickDraw','Eldoret_F',
    'Nakuru254','Achieng_P','Kimani_X','Rotich_99','Baraka_KE',
    'GhostBet','NightOwl','TacticalK','BullsEye','LuckyShot',
    'Njoroge_G','Kamau_254','Otieno_X','Waweru_P','Mwangi_99',
  ];
  const BET_TIERS = [5,10,20,50,100,200,500,1000,2000,5000];
  const MAX_ROWS  = 24;

  let rows = [];   // { id, name, bet, status, cashMult, payout, real }
  let idSeq = 0;

  function rName() { return FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)]; }
  function rBet()  { return BET_TIERS[Math.floor(Math.random() * BET_TIERS.length)]; }

  // ── Lobby: populate bots ─────────────────────
  function onLobby() {
    rows = [];
    const count = 10 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      rows.push({ id: idSeq++, name: rName(), bet: rBet(), status: 'waiting', cashMult: null, payout: null, real: false });
    }
    // Trickle more bots during countdown
    [600, 1500, 2800, 4000].forEach(delay => {
      setTimeout(() => {
        if (rows.length < MAX_ROWS) {
          rows.unshift({ id: idSeq++, name: rName(), bet: rBet(), status: 'waiting', cashMult: null, payout: null, real: false });
          render();
        }
      }, delay);
    });
    render();
  }

  // ── Tick: bots cash out randomly ─────────────
  function onTick(mult) {
    let changed = false;
    for (const r of rows) {
      if (r.status !== 'waiting' || r.real) continue;
      const base  = 0.016;
      const bonus = mult > 2 ? (mult - 2) * 0.011 : 0;
      if (Math.random() < base + bonus) {
        r.status   = 'won';
        r.cashMult = mult;
        r.payout   = Math.floor(r.bet * mult);
        changed    = true;
      }
    }
    if (changed) render();
  }

  // ── Real cashout event from another player ────
  function onCashOut(msg) {
    // msg = { mult, payout }  (username redacted server-side)
    rows.unshift({
      id: idSeq++,
      name: rName(),   // server doesn't send real names for privacy
      bet: msg.payout ? Math.floor(msg.payout / msg.mult) : rBet(),
      status: 'won',
      cashMult: msg.mult,
      payout: msg.payout,
      real: true,
    });
    if (rows.length > MAX_ROWS) rows.pop();
    render();
  }

  // ── Real bet placed by another player ─────────
  function onBetPlaced(msg) {
    rows.unshift({
      id: idSeq++,
      name: rName(),
      bet: msg.amount,
      status: 'waiting',
      cashMult: null,
      payout: null,
      real: true,
    });
    if (rows.length > MAX_ROWS) rows.pop();
    render();
  }

  // ── Crash: mark remaining bots as lost ────────
  function onCrashed(mult) {
    for (const r of rows) {
      if (r.status === 'waiting') {
        r.status   = 'lost';
        r.cashMult = mult;
      }
    }
    render();
  }

  // ── Render ────────────────────────────────────
  function render() {
    const body = document.getElementById('live-bets-body');
    if (!body) return;
    body.innerHTML = '';

    for (const r of rows.slice(0, MAX_ROWS)) {
      const row = document.createElement('div');
      row.className = `lb-row lb-${r.status}`;

      let multText = '—';
      let wonText  = '—';
      let wonClass = '';

      if (r.status === 'won') {
        multText = r.cashMult.toFixed(2) + 'x';
        wonText  = '+' + (r.payout ?? Math.floor(r.bet * r.cashMult)).toLocaleString();
        wonClass = 'lb-won-val';
      } else if (r.status === 'lost') {
        multText = r.cashMult.toFixed(2) + 'x';
        wonText  = '-' + r.bet.toLocaleString();
        wonClass = 'lb-lost-val';
      }

      row.innerHTML =
        `<span class="lb-name">${r.name}</span>` +
        `<span class="lb-bet">${r.bet.toLocaleString()}</span>` +
        `<span class="lb-mult ${r.status === 'won' ? 'lb-green' : r.status === 'lost' ? 'lb-red' : 'lb-wait'}">${multText}</span>` +
        `<span class="lb-won ${wonClass}">${wonText}</span>`;

      body.appendChild(row);
    }
  }

  return { onLobby, onTick, onCashOut, onBetPlaced, onCrashed };

})();
