'use strict';
// ═══════════════════════════════════════════════
//  MPESA  — Frontend M-Pesa UI
//  All Daraja calls go through the backend.
//  No consumer keys or secrets here.
// ═══════════════════════════════════════════════

window.Mpesa = (() => {

  let activeTab = 'deposit';

  function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tab-deposit').classList.toggle('tab-active',  tab === 'deposit');
    document.getElementById('tab-withdraw').classList.toggle('tab-active', tab === 'withdraw');
    document.getElementById('deposit-panel').style.display  = tab === 'deposit'  ? 'flex' : 'none';
    document.getElementById('withdraw-panel').style.display = tab === 'withdraw' ? 'flex' : 'none';
    clearStatus();
    resetBtn();
  }

  function clearStatus() {
    const s = document.getElementById('mpesa-status');
    s.textContent = '';
    s.className   = 'mpesa-status';
  }

  function setStatus(text, cls) {
    const s = document.getElementById('mpesa-status');
    s.innerHTML   = text;
    s.className   = `mpesa-status ${cls}`;
  }

  function resetBtn() {
    const btn = document.getElementById('mpesa-pay-btn');
    btn.innerHTML = activeTab === 'deposit' ? '📲 SEND STK PUSH' : '💸 REQUEST WITHDRAWAL';
    btn.disabled  = false;
  }

  // ── Deposit ──────────────────────────────────
  async function handleDeposit() {
    const phone  = document.getElementById('mpesa-phone').value.trim();
    const amount = parseFloat(document.getElementById('mpesa-amount').value);
    const btn    = document.getElementById('mpesa-pay-btn');

    if (!phone)  { setStatus('⚠ Enter your Safaricom number', 'err'); return; }
    if (!amount || amount < CONFIG.DEPOSIT_MIN) { setStatus(`⚠ Minimum deposit is KES ${CONFIG.DEPOSIT_MIN}`, 'err'); return; }
    if (amount > CONFIG.DEPOSIT_MAX)            { setStatus(`⚠ Maximum is KES ${CONFIG.DEPOSIT_MAX.toLocaleString()}`, 'err'); return; }

    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner"></span>SENDING...';
    setStatus('📲 Connecting to Safaricom...', 'pending');

    try {
      const res = await API.deposit(phone, amount);
      setStatus(
        `✅ STK Push sent! Check your phone.<br>` +
        `<span style="opacity:.5;font-size:10px">Ref: ${res.checkoutRequestId || '—'}</span><br>` +
        `<span style="color:#1a8a3a">Your wallet will update automatically when payment is confirmed.</span>`,
        'ok'
      );
      btn.disabled  = false;
      btn.innerHTML = '📲 SEND ANOTHER';
    } catch (err) {
      setStatus('❌ ' + err.message, 'err');
      resetBtn();
    }
  }

  // ── Withdrawal ───────────────────────────────
  async function handleWithdraw() {
    const phone  = document.getElementById('withdraw-phone').value.trim();
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const wallet = Game.getWallet();
    const btn    = document.getElementById('mpesa-pay-btn');

    if (!phone)  { setStatus('⚠ Enter your Safaricom number', 'err'); return; }
    if (!amount || amount < CONFIG.DEPOSIT_MIN) { setStatus(`⚠ Minimum withdrawal is KES ${CONFIG.DEPOSIT_MIN}`, 'err'); return; }
    if (amount > CONFIG.DEPOSIT_MAX)            { setStatus(`⚠ Maximum is KES ${CONFIG.DEPOSIT_MAX.toLocaleString()}`, 'err'); return; }
    if (amount > wallet)                        { setStatus(`⚠ Insufficient LOOT (you have ${wallet.toLocaleString()})`, 'err'); return; }

    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner"></span>PROCESSING...';
    setStatus('💸 Sending to Safaricom...', 'pending');

    try {
      const res = await API.withdraw(phone, amount);
      // Wallet already updated server-side; backend sends wallet_update via WS
      setStatus(
        `✅ Withdrawal sent!<br>` +
        `<span style="opacity:.5;font-size:10px">Ref: ${res.conversationId || '—'}</span><br>` +
        `<span style="color:#1a8a3a">KES ${Math.floor(amount).toLocaleString()} will arrive shortly.</span>`,
        'ok'
      );
      btn.innerHTML = '💸 REQUEST ANOTHER';
      btn.disabled  = false;
      setTimeout(() => UI.closeMpesa(), 3000);
    } catch (err) {
      setStatus('❌ ' + err.message, 'err');
      resetBtn();
    }
  }

  function init() {
    document.getElementById('tab-deposit').addEventListener('click', () => switchTab('deposit'));
    document.getElementById('tab-withdraw').addEventListener('click', () => switchTab('withdraw'));

    document.getElementById('mpesa-pay-btn').addEventListener('click', () => {
      if (activeTab === 'deposit') handleDeposit();
      else                         handleWithdraw();
    });

    document.querySelectorAll('.amt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = activeTab === 'deposit' ? 'mpesa-amount' : 'withdraw-amount';
        document.getElementById(target).value = btn.dataset.a;
      });
    });

    ['mpesa-close', 'mpesa-cancel'].forEach(id => {
      document.getElementById(id).addEventListener('click', () => UI.closeMpesa());
    });
  }

  return { init, switchTab };

})();
