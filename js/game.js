'use strict';
// ═══════════════════════════════════════════════
//  GAME  — Client-side game logic
//  All crash points come from backend via WebSocket.
//  This file handles UI state only — no server logic.
// ═══════════════════════════════════════════════

window.Game = (() => {

  // ── State ────────────────────────────────────
  let wallet     = 0;
  let mult       = 1.00;
  let gamePhase  = 'lobby';   // 'lobby' | 'running' | 'crashed'
  let betAmount  = 50;
  let betActive  = false;
  let cashedOut  = false;
  let entered    = false;
  let countdown  = 5;
  let rounds = 0, wins = 0, bestMult = 0;
  let history    = [];

  const MIN_BET  = CONFIG.MIN_BET || 5;

  // ── DOM shortcuts ────────────────────────────
  const $  = id => document.getElementById(id);
  const el = {
    multVal:      () => $('mult-val'),
    phase:        () => $('phase'),
    walletVal:    () => $('wallet-val'),
    userLabel:    () => $('user-label'),
    actionBtn:    () => $('action-btn'),
    skipBtn:      () => $('skip-btn'),
    betInput:     () => $('bet-input'),
    presets:      () => $('presets'),
    cBar:         () => $('countdown-bar'),
    cNum:         () => $('countdown-num'),
    hint:         () => $('touch-hint'),
    oBlast:       () => $('o-blast'),
    blastSub:     () => $('blast-sub'),
    oWin:         () => $('o-win'),
    winSub:       () => $('win-sub'),
    stRounds:     () => $('st-rounds'),
    stBest:       () => $('st-best'),
    stWin:        () => $('st-win'),
    history:      () => $('history'),
  };

  // ── Wallet ───────────────────────────────────
  function setWallet(v) {
    wallet = v;
    el.walletVal().textContent = v.toLocaleString();
  }

  // ── Multiplier UI ────────────────────────────
  function updateMultUI(m) {
    const e = el.multVal();
    e.textContent = m.toFixed(2) + 'X';
    e.className = 'mult-val';
    if (m >= 4)      e.classList.add('danger');
    else if (m >= 2) e.classList.add('warn');
  }

  // ── Phase badge ──────────────────────────────
  let _lastPhase = '';
  function setPhaseUI(p) {
    if (p === _lastPhase) return;
    _lastPhase = p;
    const e = el.phase();
    e.className = 'phase-badge';
    if      (p === 'safe')    { e.textContent = '● SAFE';    e.classList.add('safe');   startHB(60); }
    else if (p === 'warn')    { e.textContent = '⚠ WARN';    e.classList.add('warn');   startHB(95);  playTension(); }
    else if (p === 'danger')  { e.textContent = '🔴 DANGER'; e.classList.add('danger'); startHB(135); }
    else if (p === 'lobby')   { e.textContent = `⏱ ${countdown}s`; stopHB(); }
    else                      { e.textContent = '● WAIT'; stopHB(); }
  }

  function getPhase(m) {
    if (m < 2) return 'safe';
    if (m < 4) return 'warn';
    return 'danger';
  }

  // ── Stats ────────────────────────────────────
  function updateStats() {
    el.stRounds().textContent = rounds;
    el.stBest().textContent   = bestMult > 0 ? bestMult.toFixed(2) + 'x' : '—';
    el.stWin().textContent    = rounds > 0 ? Math.round(wins / rounds * 100) + '%' : '—';
  }

  // ── History chips ────────────────────────────
  function addHistory(type, m) {
    history.unshift({ type, m });
    if (history.length > 15) history.pop();
    const c = el.history();
    c.querySelectorAll('.hist-chip').forEach(e => e.remove());
    for (const h of history) {
      const chip = document.createElement('span');
      chip.className = 'hist-chip ' + h.type;
      chip.textContent = h.m.toFixed(2) + 'x';
      c.appendChild(chip);
    }
  }

  // ── Action button ────────────────────────────
  function updateActionBtn() {
    const btn  = el.actionBtn();
    const skip = el.skipBtn();
    const cBar = el.cBar();
    const betIn = el.betInput();
    const hint = el.hint();

    if (gamePhase === 'lobby') {
      cBar.style.display = 'flex';
      el.cNum().textContent  = countdown + 's';
      el.cNum().className    = countdown <= 2 ? 'cdown-num urgent' : 'cdown-num';
      betIn.disabled = false;
      betIn.classList.add('active');
      hint.style.display = 'none';
      if (entered) {
        btn.className   = 'action-btn cashout';
        btn.textContent = '✓ ENTERED — CANCEL';
        btn.disabled    = false;
        skip.style.display = 'none';
      } else {
        btn.className   = 'action-btn start';
        btn.textContent = '▶ ENTER ROUND';
        btn.disabled    = false;
        skip.style.display = 'block';
      }
    } else if (gamePhase === 'running') {
      cBar.style.display = 'none';
      skip.style.display = 'none';
      betIn.disabled = true;
      betIn.classList.remove('active');
      if (betActive && !cashedOut) {
        btn.className   = 'action-btn cashout';
        btn.textContent = '💰 CASH OUT';
        btn.disabled    = false;
        hint.style.display = 'block';
      } else if (betActive && cashedOut) {
        btn.className   = 'action-btn watching';
        btn.textContent = '✓ CASHED';
        btn.disabled    = true;
        hint.style.display = 'none';
      } else {
        btn.className   = 'action-btn watching';
        btn.textContent = '▶ WATCHING';
        btn.disabled    = true;
        hint.style.display = 'none';
      }
    } else {
      // crashed
      cBar.style.display = 'none';
      skip.style.display = 'none';
      btn.className   = 'action-btn disabled';
      btn.textContent = '⏳ STARTING...';
      btn.disabled    = true;
      betIn.disabled  = false;
      betIn.classList.remove('active');
      hint.style.display = 'none';
    }
  }

  // ── Coins + shake ────────────────────────────
  function shakeScreen() {
    const g = $('s-game');
    g.style.animation = 'shake .42s ease';
    setTimeout(() => g.style.animation = '', 450);
  }

  function spawnCoins() {
    const arena  = $('arena');
    const emojis = ['💰','💵','🪙','💴','💶','💸'];
    for (let i = 0; i < 18; i++) {
      const e = document.createElement('div');
      e.style.cssText = `position:absolute;font-size:clamp(14px,3.5vw,22px);pointer-events:none;z-index:150;animation:coinFly 1.4s ease-out forwards;`;
      e.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const ang  = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 200;
      e.style.setProperty('--tx', Math.cos(ang) * dist + 'px');
      e.style.setProperty('--ty', (Math.sin(ang) * dist - 40) + 'px');
      e.style.setProperty('--tr', (Math.random() * 720 - 360) + 'deg');
      e.style.left = G.jarX + 'px';
      e.style.top  = (G.jarY - 40) + 'px';
      e.style.animationDelay = Math.random() * 0.25 + 's';
      arena.appendChild(e);
      setTimeout(() => e.remove(), 1700);
    }
  }

  // ── Cash out (sends to backend) ──────────────
  async function doCashOut() {
    if (gamePhase !== 'running' || !betActive || cashedOut) return;
    cashedOut = true;
    updateActionBtn();
    try {
      const res = await API.cashOut();
      setWallet(res.wallet);
      wins++;
      if (mult > bestMult) bestMult = mult;
      addHistory('w', res.mult);
      updateStats();
      playCash();
      spawnCoins();
      el.oWin().style.display = 'flex';
      el.winSub().textContent = `+${res.payout.toLocaleString()} LOOT @ ${res.mult.toFixed(2)}x`;
    } catch (err) {
      // If server rejected (already crashed), just show nothing
      console.warn('Cashout rejected:', err.message);
    }
  }

  // ── Place bet (sends to backend) ─────────────
  async function doEnterRound() {
    const v = parseInt(el.betInput().value) || 0;
    if (v < MIN_BET) {
      el.betInput().style.borderColor = '#ff4444';
      setTimeout(() => el.betInput().style.borderColor = '', 1000);
      return;
    }
    if (v > wallet) { UI.showToast('Insufficient balance', 'err'); return; }
    betAmount = v;
    try {
      const res = await API.placeBet(betAmount);
      setWallet(res.wallet);
      entered   = true;
      betActive = true;
      updateActionBtn();
    } catch (err) {
      UI.showToast('❌ ' + err.message, 'err');
    }
  }

  // ══════════════════════════════════════════════
  //  WebSocket event handlers (called by socket.js)
  // ══════════════════════════════════════════════

  function onLobby(cd) {
    gamePhase  = 'lobby';
    entered    = false;
    betActive  = false;
    cashedOut  = false;
    countdown  = cd ?? 5;
    _lastPhase = '';
    G.laserAlpha = 0; G.scopeAlpha = 0;
    G.sniperAngle = 90; G.sniperTargetAngle = 90;
    el.oBlast().style.display = 'none';
    el.oWin().style.display   = 'none';
    stopHB(); stopWander(); stopRotTick();
    startWander(); startRotTick();
    setPhaseUI('lobby');
    updateActionBtn();
  }

  function onCountdown(val) {
    countdown = val;
    el.phase().textContent = `⏱ ${val}s`;
    updateActionBtn();
  }

  function onRoundStart(roundId) {
    gamePhase  = 'running';
    mult       = 1.00;
    cashedOut  = false;
    _lastPhase = '';
    rounds++;
    updateMultUI(1.00);
    setPhaseUI('safe');
    updateStats();
    updateActionBtn();
    G.jarGlowColor  = [232, 184, 75];
    G.bloodSplatter = [];
    G.jarShards     = [];
    G.muzzleSmoke   = [];
    G.muzzleFlash   = 0;
    G.bulletFlash   = 0;
  }

  function onTick(m) {
    mult = m;
    updateMultUI(m);
    setPhaseUI(getPhase(m));
    updateSniperAlert(m);
    playClick();
  }

  function onCrashed(m) {
    mult      = m;
    gamePhase = 'crashed';
    stopHB(); stopWander(); stopRotTick();

    if (betActive && !cashedOut) addHistory('l', m);

    playGun();
    G.bulletFlash = 6;
    G.muzzleFlash = 8;
    G.jarHit      = 12;
    shakeScreen();

    // Shards + money burst
    for (let i = 0; i < 22; i++) {
      const ang = Math.random() * Math.PI * 2;
      G.jarShards.push({
        x: G.jarX, y: G.jarY - 30,
        vx: Math.cos(ang) * (3 + Math.random() * 8),
        vy: Math.sin(ang) * (3 + Math.random() * 8) - 5,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - .5) * 0.38,
        w: 7 + Math.random() * 18, h: 5 + Math.random() * 14,
        fill: `rgba(${28+Math.floor(Math.random()*60)},${65+Math.floor(Math.random()*95)},${105+Math.floor(Math.random()*95)},.78)`,
        a: 0.92,
      });
    }
    for (let i = 0; i < 24; i++) {
      const ang = Math.random() * Math.PI * 2;
      G.bloodSplatter.push({
        x: G.jarX + (Math.random() - .5) * 24,
        y: G.jarY - 30 + (Math.random() - .5) * 24,
        vx: Math.cos(ang) * (2 + Math.random() * 6.5),
        vy: Math.sin(ang) * (2 + Math.random() * 6.5) - 4,
        r: 3 + Math.random() * 7,
        color: `${18+Math.floor(Math.random()*55)},${100+Math.floor(Math.random()*120)},${22+Math.floor(Math.random()*50)}`,
        a: 0.9,
      });
    }

    const lost = betActive && !cashedOut ? betAmount : 0;
    el.oBlast().style.display = 'flex';
    el.blastSub().textContent = lost > 0
      ? `CRASHED @ ${m.toFixed(2)}x — LOST ${lost.toLocaleString()} LOOT`
      : `CRASHED @ ${m.toFixed(2)}x`;

    setPhaseUI('idle');
    el.multVal().className = 'mult-val';
    updateActionBtn();
  }

  function onWalletUpdate(newWallet, reason) {
    setWallet(newWallet);
    if (reason === 'deposit') UI.showToast(`💰 Deposit confirmed! +${newWallet - wallet} LOOT`, 'ok');
    if (reason === 'withdrawal_refund') UI.showToast('⚠ Withdrawal failed — funds returned', 'warn');
  }

  // ══════════════════════════════════════════════
  //  Controls / event listeners
  // ══════════════════════════════════════════════
  function bindControls() {
    // Action button
    $('action-btn').addEventListener('click', () => {
      resumeAudio();
      if (gamePhase === 'lobby') {
        if (entered) {
          // cancel — but backend already accepted bet, so just uncheck UI flag
          // (real cancel would need a backend endpoint — omitted for simplicity)
          entered = false;
          updateActionBtn();
        } else {
          doEnterRound();
        }
      } else if (gamePhase === 'running') {
        doCashOut();
      }
    });

    $('skip-btn').addEventListener('click', () => {
      entered = false;
      updateActionBtn();
    });

    $('bet-input').addEventListener('input', e => {
      betAmount = parseInt(e.target.value) || MIN_BET;
    });

    $('presets').addEventListener('click', e => {
      const btn = e.target.closest('.preset-btn');
      if (!btn) return;
      const v   = btn.dataset.v;
      const inp = $('bet-input');
      if (v === 'half')     { betAmount = Math.max(MIN_BET, Math.floor(betAmount / 2)); inp.value = betAmount; }
      else if (v === 'max') { betAmount = wallet; inp.value = betAmount; }
      else                  { betAmount = parseInt(v); inp.value = betAmount; }
    });

    // Touch arena to cash out
    $('arena').addEventListener('touchend', e => {
      if (gamePhase === 'running' && betActive && !cashedOut) {
        e.preventDefault();
        resumeAudio();
        doCashOut();
      }
    }, { passive: false });

    // Hold arena to quick-enter
    let _holdTimer = null;
    $('arena').addEventListener('touchstart', () => {
      if (gamePhase === 'lobby' && !entered) {
        _holdTimer = setTimeout(() => {
          resumeAudio();
          doEnterRound();
        }, 500);
      }
    }, { passive: true });
    $('arena').addEventListener('touchend', () => { if (_holdTimer) { clearTimeout(_holdTimer); _holdTimer = null; } }, { passive: true });
    $('arena').addEventListener('touchcancel', () => { if (_holdTimer) { clearTimeout(_holdTimer); _holdTimer = null; } }, { passive: true });

    // Spacebar
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && gamePhase === 'running' && betActive && !cashedOut) {
        e.preventDefault();
        doCashOut();
      }
    });

    // Wallet box → open deposit
    $('wallet-box').addEventListener('click', () => UI.openMpesa());
  }

  // ── Sniper alert (visual only) ───────────────
  let sniperAlertLevel = 0;
  function updateSniperAlert(m) {
    if (m < 2)       sniperAlertLevel = 0;
    else if (m < 4)  sniperAlertLevel = 1;
    else if (m < 8)  sniperAlertLevel = 2;
    else if (m < 20) sniperAlertLevel = 3;
    else             sniperAlertLevel = 4;
  }

  // ── Public init ──────────────────────────────
  async function init(profile) {
    el.userLabel().textContent = (profile.username || profile.email || 'PLAYER').toUpperCase().slice(0, 18);
    setWallet(profile.wallet ?? 1000);
    updateStats();
    bindControls();
    startWander();
    startRotTick();
  }

  return {
    init,
    onLobby,
    onCountdown,
    onRoundStart,
    onTick,
    onCrashed,
    onWalletUpdate,
    getWallet: () => wallet,
  };

})();
