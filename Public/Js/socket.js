'use strict';
// ═══════════════════════════════════════════════
//  SOCKET  — WebSocket client
//  Receives all game events from backend engine
// ═══════════════════════════════════════════════

window.Socket = (() => {
  let ws          = null;
  let reconnectMs = 1500;
  let reconnectTimer = null;
  let dead        = false;

  function connect() {
    if (dead) return;
    const token = Auth.token();
    const url   = token
      ? `${CONFIG.WS_URL}?token=${encodeURIComponent(token)}`
      : CONFIG.WS_URL;

    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectMs = 1500;
      console.log('[WS] connected');
    };

    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      dispatch(msg);
    };

    ws.onclose = () => {
      if (dead) return;
      console.log(`[WS] closed — reconnecting in ${reconnectMs}ms`);
      reconnectTimer = setTimeout(connect, reconnectMs);
      reconnectMs    = Math.min(reconnectMs * 1.5, 15000);
    };

    ws.onerror = (err) => {
      console.error('[WS] error', err);
      ws.close();
    };
  }

  // Route each message type to the right handler
  function dispatch(msg) {
    switch (msg.type) {
      case 'state':
      case 'lobby':
        Game.onLobby(msg.countdown ?? 5);
        break;
      case 'countdown':
        Game.onCountdown(msg.value);
        break;
      case 'round_start':
        Game.onRoundStart(msg.roundId);
        break;
      case 'tick':
        Game.onTick(msg.mult);
        LiveBets.onTick(msg.mult);
        break;
      case 'crashed':
        Game.onCrashed(msg.mult);
        LiveBets.onCrashed(msg.mult);
        break;
      case 'bet_placed':
        LiveBets.onBetPlaced(msg);
        break;
      case 'cash_out':
        LiveBets.onCashOut(msg);
        break;
      case 'wallet_update':
        Game.onWalletUpdate(msg.wallet, msg.reason);
        break;
      case 'deposit_failed':
        UI.showToast('❌ Deposit failed: ' + msg.message, 'err');
        break;
    }
  }

  return {
    connect,
    disconnect() {
      dead = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
    reconnect() {
      dead = false;
      connect();
    },
  };
})();
