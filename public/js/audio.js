'use strict';
// ════════════════════════════════════════
//  AUDIO ENGINE
// ════════════════════════════════════════
let _actx = null;
function getACtx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  return _actx;
}
function resumeAudio() { try { getACtx().resume(); } catch(e){} }

function tone(freq, type, vol, dur, when) {
  try {
    const ctx = getACtx(), t = when ?? ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); osc.stop(t + dur);
  } catch(e){}
}

function playClick()   { tone(440, 'sine', 0.04, 0.04); }
function playTension() { tone(220, 'sawtooth', 0.06, 0.5); }
function playCash() {
  tone(880,  'sine', 0.12, 0.12);
  tone(1320, 'sine', 0.10, 0.18, getACtx().currentTime + 0.08);
  tone(1760, 'sine', 0.07, 0.24, getACtx().currentTime + 0.18);
}

function playGun() {
  try {
    const ctx = getACtx();
    // Crack layer
    const crackBuf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const cd = crackBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++)
      cd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
    const crack = ctx.createBufferSource();
    const crackGain = ctx.createGain();
    crack.buffer = crackBuf; crack.connect(crackGain); crackGain.connect(ctx.destination);
    crackGain.gain.setValueAtTime(1.2, ctx.currentTime);
    crackGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    crack.start();

    // Body rumble
    const bodyBuf = ctx.createBuffer(1, ctx.sampleRate * 0.55, ctx.sampleRate);
    const bd = bodyBuf.getChannelData(0);
    for (let i = 0; i < bd.length; i++)
      bd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.07));
    const body = ctx.createBufferSource();
    const bodyGain = ctx.createGain();
    // Low-pass filter for body
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 400;
    body.buffer = bodyBuf; body.connect(lp); lp.connect(bodyGain); bodyGain.connect(ctx.destination);
    bodyGain.gain.setValueAtTime(0.9, ctx.currentTime + 0.01);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    body.start(ctx.currentTime + 0.01);
  } catch(e){}
}

let _hbInt = null;
function startHB(bpm) {
  stopHB();
  const ms = (60000 / bpm) / 2;
  _hbInt = setInterval(() => {
    tone(60, 'sine', 0.12, 0.08);
    setTimeout(() => tone(50, 'sine', 0.08, 0.06), 90);
  }, ms);
}
function stopHB() { if (_hbInt) { clearInterval(_hbInt); _hbInt = null; } }
