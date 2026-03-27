'use strict';
// ════════════════════════════════════════
//  CANVAS ENGINE
// ════════════════════════════════════════
const canvas = document.getElementById('canvas');
const cx = canvas.getContext('2d');
let W = 0, H = 0;
const DPR = window.devicePixelRatio || 1;

function resizeCanvas() {
  const arena = document.getElementById('arena');
  W = arena.offsetWidth;
  H = arena.offsetHeight;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
new ResizeObserver(resizeCanvas).observe(document.getElementById('arena'));
resizeCanvas();

// ── Visual State ──
const G = {
  // Jar
  jarX: 0, jarY: 0,
  jarGlowColor: [232, 184, 75],
  jarShards: [], bloodSplatter: [], jarHit: 0,
  // Sniper
  sniperAngle: 90, sniperTargetAngle: 90, sniperY: 0,
  // Weapons / FX
  laserAlpha: 0, scopeAlpha: 0,
  muzzleFlash: 0, bulletFlash: 0,
  muzzleSmoke: [],
  // Environment
  stars: Array.from({length: 55}, () => ({
    x: Math.random(), y: Math.random() * 0.55,
    r: 0.3 + Math.random() * 1.4,
    a: 0.05 + Math.random() * 0.18,
    twinkle: Math.random() * Math.PI * 2,
    speed: 0.01 + Math.random() * 0.04
  })),
  dustParticles: Array.from({length: 28}, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - .5) * 0.0003,
    vy: (Math.random() - .5) * 0.0002,
    r: 0.4 + Math.random() * 1.5,
    a: Math.random() * 0.1
  })),
  // City windows
  windowFlicker: [],
  frameCount: 0,
};

// Pre-build window positions for performance
(function buildWindows() {
  for (let i = 0; i < 60; i++) {
    G.windowFlicker.push({
      rx: Math.random(),
      ry: Math.random(),
      on: Math.random() > 0.4,
      timer: Math.floor(Math.random() * 200),
      col: Math.floor(Math.random() * 3)
    });
  }
})();

// City building layout (normalized x, height-fraction)
const BUILDINGS = [
  [0,.04],[.03,.07],[.06,.055],[.09,.10],[.13,.065],[.16,.09],
  [.19,.055],[.22,.12],[.27,.075],[.30,.10],[.33,.065],[.36,.085],
  [.39,.055],[.42,.11],[.47,.08],[.50,.065],[.53,.095],[.56,.07],
  [.59,.115],[.63,.08],[.66,.09],[.69,.065],[.72,.10],[.76,.07],
  [.79,.085],[.82,.055],[.85,.09],[.88,.115],[.91,.07],[.94,.09],
  [.97,.065],[1,.04]
];

// ════════════════════════════════════════
//  BACKGROUND
// ════════════════════════════════════════
function drawBG() {
  cx.fillStyle = '#04070a';
  cx.fillRect(0, 0, W, H);

  const floorY = H * 0.77;

  // Sky gradient
  const sky = cx.createLinearGradient(0, 0, 0, floorY);
  sky.addColorStop(0, '#020508');
  sky.addColorStop(0.6, '#04070a');
  sky.addColorStop(1, '#060d14');
  cx.fillStyle = sky;
  cx.fillRect(0, 0, W, floorY);

  // Moon
  const moonX = W * 0.82, moonY = H * 0.12;
  const moonGlow = cx.createRadialGradient(moonX, moonY, 0, moonX, moonY, W * 0.1);
  moonGlow.addColorStop(0, 'rgba(200,220,255,.12)');
  moonGlow.addColorStop(1, 'transparent');
  cx.fillStyle = moonGlow;
  cx.fillRect(moonX - W * 0.1, moonY - W * 0.1, W * 0.2, W * 0.2);
  cx.beginPath();
  cx.arc(moonX, moonY, W * 0.025, 0, Math.PI * 2);
  cx.fillStyle = 'rgba(210,225,255,.85)';
  cx.fill();
  // Moon craters
  cx.fillStyle = 'rgba(170,190,220,.3)';
  [[-.008,.006,.006],[.006,.012,.004],[-.002,-.008,.003]].forEach(([dx,dy,r]) => {
    cx.beginPath(); cx.arc(moonX + dx*W, moonY + dy*W, r*W, 0, Math.PI*2); cx.fill();
  });

  // Stars
  G.frameCount++;
  for (const s of G.stars) {
    s.twinkle += s.speed;
    const a = s.a * (0.6 + 0.4 * Math.sin(s.twinkle));
    cx.beginPath();
    cx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    cx.fillStyle = `rgba(200,220,255,${a})`;
    cx.fill();
  }

  // City silhouette
  cx.beginPath();
  cx.moveTo(0, H);
  for (let i = 0; i < BUILDINGS.length - 1; i++) {
    const x0 = BUILDINGS[i][0] * W,   h0 = BUILDINGS[i][1] * H;
    const x1 = BUILDINGS[i+1][0] * W, h1 = BUILDINGS[i+1][1] * H;
    cx.lineTo(x0, floorY - h0);
    cx.lineTo(x1, floorY - h0);
  }
  cx.lineTo(W, H); cx.closePath();
  const buildGrad = cx.createLinearGradient(0, floorY - H * 0.14, 0, floorY);
  buildGrad.addColorStop(0, '#07101a');
  buildGrad.addColorStop(1, '#050c14');
  cx.fillStyle = buildGrad;
  cx.fill();

  // Building outlines (faint)
  cx.strokeStyle = 'rgba(14,30,50,.6)';
  cx.lineWidth = 0.5;
  for (let i = 0; i < BUILDINGS.length - 1; i++) {
    const x0 = BUILDINGS[i][0] * W,   h0 = BUILDINGS[i][1] * H;
    const x1 = BUILDINGS[i+1][0] * W;
    cx.beginPath(); cx.moveTo(x0, floorY - h0); cx.lineTo(x1, floorY - h0); cx.stroke();
    cx.beginPath(); cx.moveTo(x0, floorY - h0); cx.lineTo(x0, floorY); cx.stroke();
  }

  // Window lights
  for (const w of G.windowFlicker) {
    w.timer--;
    if (w.timer <= 0) {
      w.on = Math.random() > 0.35;
      w.timer = 80 + Math.floor(Math.random() * 300);
    }
    if (!w.on) continue;
    // Map to building area
    const bx = w.rx * W;
    const bi = Math.min(BUILDINGS.length - 2, Math.floor(w.rx * (BUILDINGS.length - 1)));
    const bh = BUILDINGS[bi][1] * H;
    const wy = floorY - bh * (0.1 + w.ry * 0.8);
    if (wy > floorY) continue;
    const cols = ['rgba(255,200,80,.35)', 'rgba(160,200,255,.2)', 'rgba(80,200,80,.18)'];
    cx.fillStyle = cols[w.col];
    cx.fillRect(bx, wy, 2.5, 1.5);
  }

  // Dust/smoke particles
  for (const p of G.dustParticles) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
    if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
    cx.beginPath();
    cx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
    cx.fillStyle = `rgba(120,160,200,${p.a})`;
    cx.fill();
  }

  // Floor — wet concrete with reflections
  const floorG = cx.createLinearGradient(0, floorY, 0, H);
  floorG.addColorStop(0, 'rgba(14,22,34,.98)');
  floorG.addColorStop(0.4, 'rgba(10,16,26,.95)');
  floorG.addColorStop(1, 'rgba(6,10,18,.9)');
  cx.fillStyle = floorG;
  cx.fillRect(0, floorY, W, H - floorY);

  // Floor reflection streak
  cx.beginPath();
  cx.moveTo(W * 0.1, floorY);
  cx.lineTo(W * 0.9, floorY);
  cx.strokeStyle = 'rgba(30,60,100,.25)';
  cx.lineWidth = 1;
  cx.stroke();

  // Perspective grid on floor
  const vp = { x: W * 0.5, y: floorY };
  cx.lineWidth = 0.7;
  const gridCols = 16;
  for (let i = 0; i <= gridCols; i++) {
    const fx = (i / gridCols) * W;
    const sx = vp.x + (fx - vp.x) * 0.04;
    const alpha = 0.3 - Math.abs((i / gridCols) - 0.5) * 0.3;
    cx.strokeStyle = `rgba(20,36,58,${alpha})`;
    cx.beginPath(); cx.moveTo(sx, floorY); cx.lineTo(fx, H); cx.stroke();
  }
  for (let r = 0; r <= 5; r++) {
    const t = r / 5;
    const ry = floorY + t * (H - floorY);
    cx.strokeStyle = `rgba(18,32,52,${0.4 * (1 - t * 0.6)})`;
    cx.beginPath(); cx.moveTo(0, ry); cx.lineTo(W, ry); cx.stroke();
  }

  // Fog at top
  const fog = cx.createLinearGradient(0, 0, 0, H * 0.5);
  fog.addColorStop(0, 'rgba(4,7,10,.65)');
  fog.addColorStop(1, 'transparent');
  cx.fillStyle = fog; cx.fillRect(0, 0, W, H * 0.5);
}

// ════════════════════════════════════════
//  JAR / PRIZE
// ════════════════════════════════════════
function drawJar(x, y, sc) {
  cx.save();
  cx.translate(x, y);
  const [gr, gg, gb] = G.jarGlowColor;
  const glowA = G.jarHit > 0 ? 0.65 : 0.24;

  // Outer glow
  const glow = cx.createRadialGradient(0, -30*sc, 0, 0, -30*sc, 95*sc);
  glow.addColorStop(0, `rgba(${gr},${gg},${gb},${glowA})`);
  glow.addColorStop(1, 'transparent');
  cx.fillStyle = glow;
  cx.fillRect(-95*sc, -120*sc, 190*sc, 140*sc);

  // Jar body
  cx.beginPath();
  cx.moveTo(-29*sc, -72*sc);
  cx.bezierCurveTo(-34*sc,-74*sc,-42*sc,-52*sc,-42*sc,-18*sc);
  cx.bezierCurveTo(-42*sc,14*sc,-35*sc,24*sc,-25*sc,26*sc);
  cx.lineTo(25*sc, 26*sc);
  cx.bezierCurveTo(35*sc,24*sc,42*sc,14*sc,42*sc,-18*sc);
  cx.bezierCurveTo(42*sc,-52*sc,34*sc,-74*sc,29*sc,-72*sc);
  cx.closePath();
  const jg = cx.createLinearGradient(-42*sc, 0, 42*sc, 0);
  jg.addColorStop(0, 'rgba(16,36,66,.58)');
  jg.addColorStop(0.28,'rgba(28,60,108,.74)');
  jg.addColorStop(0.72,'rgba(28,60,108,.74)');
  jg.addColorStop(1, 'rgba(16,36,66,.58)');
  cx.fillStyle = jg; cx.fill();
  cx.strokeStyle = 'rgba(65,135,210,.38)';
  cx.lineWidth = 1.6 * sc; cx.stroke();

  // Glass inner glow
  const innerG = cx.createRadialGradient(0,-20*sc,5*sc,0,-20*sc,40*sc);
  innerG.addColorStop(0, `rgba(${gr},${gg},${gb},.12)`);
  innerG.addColorStop(1, 'transparent');
  cx.fillStyle = innerG;
  cx.beginPath();
  cx.ellipse(0,-15*sc,28*sc,30*sc,0,0,Math.PI*2);
  cx.fill();

  // Lid
  cx.beginPath();
  cx.roundRect(-32*sc,-86*sc,64*sc,15*sc,4*sc);
  cx.fillStyle = 'rgba(50,70,95,.94)'; cx.fill();
  cx.strokeStyle = 'rgba(85,125,175,.45)'; cx.lineWidth = 1.3*sc; cx.stroke();
  // Lid ridge
  cx.beginPath(); cx.roundRect(-28*sc,-83*sc,56*sc,3*sc,1*sc);
  cx.fillStyle = 'rgba(100,140,180,.18)'; cx.fill();

  // Bills inside
  const billColors = ['#1a4a22','#164020','#1e5226','#163c1c','#1a4a22'];
  for (let i = 0; i < 5; i++) {
    const by = (-62 + i * 19) * sc;
    cx.beginPath(); cx.roundRect(-22*sc, by, 44*sc, 15*sc, 2*sc);
    cx.fillStyle = billColors[i]; cx.fill();
    cx.strokeStyle = '#2a6a32'; cx.lineWidth = 0.8*sc; cx.stroke();
    cx.fillStyle = '#3aaa4a';
    cx.font = `bold ${7*sc}px 'Share Tech Mono',monospace`;
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('KES', 0, by + 7.5*sc);
  }

  // Highlight streak
  cx.beginPath();
  cx.moveTo(-24*sc,-68*sc); cx.bezierCurveTo(-34*sc,-52*sc,-34*sc,-30*sc,-24*sc,-6*sc);
  cx.lineWidth = 2.8*sc; cx.strokeStyle = 'rgba(180,225,255,.13)'; cx.stroke();

  // Laser dot removed

  // Hit flash ring
  if (G.jarHit > 0) {
    G.jarHit--;
    const prog = G.jarHit / 12;
    cx.beginPath(); cx.arc(0,-20*sc,50*sc*prog,0,Math.PI*2);
    cx.fillStyle = `rgba(255,200,50,${prog*.48})`; cx.fill();
    cx.strokeStyle = `rgba(255,180,30,${prog*.7})`;
    cx.lineWidth = 2*sc; cx.stroke();
  }

  // Shards
  for (let i = G.jarShards.length-1; i >= 0; i--) {
    const s = G.jarShards[i];
    s.x += s.vx; s.y += s.vy; s.vy += 0.34;
    s.rot += s.rotV; s.a *= 0.925;
    if (s.a < 0.01) { G.jarShards.splice(i,1); continue; }
    cx.save();
    cx.translate(s.x-x, s.y-y); cx.rotate(s.rot);
    cx.fillStyle = s.fill.replace(/[\d.]+\)$/, `${s.a})`);
    cx.fillRect(-s.w/2,-s.h/2,s.w,s.h);
    // Glass glint
    cx.strokeStyle = `rgba(180,220,255,${s.a*.3})`;
    cx.lineWidth = 0.5;
    cx.strokeRect(-s.w/2,-s.h/2,s.w,s.h);
    cx.restore();
  }

  // Money burst
  for (let i = G.bloodSplatter.length-1; i >= 0; i--) {
    const s = G.bloodSplatter[i];
    s.x += s.vx; s.y += s.vy; s.vy += 0.22;
    s.vx *= 0.97; s.a *= 0.932;
    if (s.a < 0.02) { G.bloodSplatter.splice(i,1); continue; }
    cx.beginPath(); cx.arc(s.x-x,s.y-y,s.r,0,Math.PI*2);
    cx.fillStyle = `rgba(${s.color},${s.a})`; cx.fill();
  }

  cx.restore();
}

// ════════════════════════════════════════
//  SNIPER
// ════════════════════════════════════════
function drawSniper(x, y, sc) {
  cx.save();
  cx.translate(x, y);
  const aRad = (G.sniperAngle * Math.PI) / 180;

  // Shadow on floor
  cx.beginPath();
  cx.ellipse(0, 12*sc, 26*sc, 9*sc, 0, 0, Math.PI*2);
  cx.fillStyle = 'rgba(0,0,0,.5)'; cx.fill();

  // ── BOOTS ──
  for (const [bx, extra] of [[-12, 0], [6, 0]]) {
    cx.beginPath(); cx.roundRect(bx*sc, -2*sc, 14*sc, 17*sc, [4*sc,4*sc,8*sc,4*sc]);
    cx.fillStyle = '#141c24'; cx.fill();
    cx.strokeStyle = '#1c2630'; cx.lineWidth = 0.8*sc; cx.stroke();
    // Sole
    cx.beginPath(); cx.roundRect((bx-1.5)*sc, 13*sc, 16*sc, 4*sc, 2*sc);
    cx.fillStyle = '#0c1218'; cx.fill();
    // Lace line
    cx.strokeStyle = 'rgba(40,60,80,.6)'; cx.lineWidth = 0.6*sc;
    cx.beginPath(); cx.moveTo((bx+2)*sc, 3*sc); cx.lineTo((bx+11)*sc, 3*sc); cx.stroke();
    cx.beginPath(); cx.moveTo((bx+2)*sc, 7*sc); cx.lineTo((bx+11)*sc, 7*sc); cx.stroke();
  }

  // ── PANTS (camo) ──
  cx.save();
  cx.beginPath(); cx.roundRect(-16*sc,-45*sc,34*sc,47*sc,3*sc); cx.clip();
  const pg = cx.createLinearGradient(-16*sc,-45*sc,18*sc,-45*sc);
  pg.addColorStop(0,'#182030'); pg.addColorStop(.5,'#1e2a3a'); pg.addColorStop(1,'#182030');
  cx.fillStyle = pg; cx.fillRect(-16*sc,-45*sc,34*sc,47*sc);
  // camo blobs
  cx.fillStyle = 'rgba(28,46,22,.72)';
  [[-9,-42,14,11],[2,-27,15,10],[-11,-20,11,13],[4,-11,13,9],[-8,-5,18,8]].forEach(([cx2,cy2,cw,ch])=>{
    cx.beginPath(); cx.ellipse(cx2*sc,cy2*sc,cw/2*sc,ch/2*sc,cx2*.1,0,Math.PI*2); cx.fill();
  });
  cx.restore();
  cx.strokeStyle = '#1c2c3c'; cx.lineWidth = 0.8*sc;
  cx.beginPath(); cx.roundRect(-16*sc,-45*sc,34*sc,47*sc,3*sc); cx.stroke();
  // Knee pad
  cx.beginPath(); cx.roundRect(-14*sc,-20*sc,12*sc,10*sc,2*sc);
  cx.fillStyle = '#101820'; cx.fill();
  cx.strokeStyle = '#1a2430'; cx.lineWidth = 0.6*sc; cx.stroke();
  // Cargo pocket
  cx.strokeStyle = '#253040'; cx.lineWidth = 0.7*sc;
  cx.strokeRect(-12*sc,-36*sc,11*sc,10*sc);
  cx.strokeRect(3*sc,-36*sc,11*sc,10*sc);

  // ── BELT ──
  cx.beginPath(); cx.roundRect(-16*sc,-49*sc,34*sc,7*sc,1*sc);
  cx.fillStyle = '#0c1218'; cx.fill();
  cx.beginPath(); cx.roundRect(-3.5*sc,-50*sc,7*sc,9*sc,1.5*sc);
  cx.fillStyle = '#364858'; cx.fill();

  // ── TACTICAL VEST ──
  cx.save();
  cx.beginPath(); cx.roundRect(-19*sc,-94*sc,40*sc,50*sc,6*sc); cx.clip();
  const vg = cx.createLinearGradient(-19*sc,-94*sc,21*sc,-94*sc);
  vg.addColorStop(0,'#141e2a'); vg.addColorStop(.5,'#1a2838'); vg.addColorStop(1,'#141e2a');
  cx.fillStyle = vg; cx.fillRect(-19*sc,-94*sc,40*sc,50*sc);
  // Camo
  cx.fillStyle = 'rgba(26,44,20,.6)';
  [[-8,-91,12,13],[6,-91,10,13],[-9,-74,11,11],[5,-74,12,11],[-8,-58,24,9]].forEach(([cx2,cy2,cw,ch])=>{
    cx.beginPath(); cx.roundRect(cx2*sc,cy2*sc,cw*sc,ch*sc,2*sc); cx.fill();
    cx.strokeStyle='rgba(36,58,28,.5)'; cx.lineWidth=0.5*sc; cx.stroke();
  });
  // MOLLE webbing
  cx.strokeStyle = 'rgba(36,58,28,.55)'; cx.lineWidth = 1.8*sc;
  for (let wy = -88; wy <= -55; wy += 8) {
    cx.beginPath(); cx.moveTo(-18*sc,wy*sc); cx.lineTo(20*sc,wy*sc); cx.stroke();
  }
  cx.restore();

  // ── NECK ──
  cx.beginPath(); cx.roundRect(-6*sc,-104*sc,12*sc,15*sc,3*sc);
  cx.fillStyle = '#c0a07a'; cx.fill();

  // ── HEAD ──
  cx.save();
  cx.translate(0, -110*sc);

  // Balaclava
  cx.beginPath(); cx.arc(0, 0, 18*sc, 0, Math.PI*2);
  cx.fillStyle = '#141a22'; cx.fill();
  // Face
  cx.beginPath(); cx.roundRect(-11*sc,-10*sc,22*sc,20*sc,5*sc);
  cx.fillStyle = '#c4a47c'; cx.fill();

  const angry = G.sniperAngle < 12;
  // Eyes
  for (const ex of [-5.5, 5.5]) {
    cx.beginPath(); cx.ellipse(ex*sc,-4.5*sc,4*sc,2.8*sc,0,0,Math.PI*2);
    cx.fillStyle = angry ? 'rgba(255,150,150,.92)' : '#d5e5ef'; cx.fill();
    cx.beginPath(); cx.arc(ex*sc,-4.5*sc,2.2*sc,0,Math.PI*2);
    cx.fillStyle = angry ? '#b01800' : '#284070'; cx.fill();
    cx.beginPath(); cx.arc(ex*sc,-4.5*sc,1*sc,0,Math.PI*2);
    cx.fillStyle = '#000'; cx.fill();
    cx.beginPath(); cx.arc((ex+1.4)*sc,-5.5*sc,0.55*sc,0,Math.PI*2);
    cx.fillStyle = 'rgba(255,255,255,.8)'; cx.fill();
    // Angry brow
    if (angry) {
      cx.beginPath();
      cx.moveTo((ex-3.5)*sc,-9*sc); cx.lineTo((ex+3.5)*sc,-7.5*sc);
      cx.strokeStyle='rgba(90,40,20,.85)'; cx.lineWidth=1.5*sc; cx.stroke();
    }
  }
  // Nose bridge
  cx.beginPath(); cx.moveTo(-2*sc,-1*sc); cx.lineTo(0,4*sc); cx.lineTo(2*sc,-1*sc);
  cx.strokeStyle='rgba(140,100,70,.4)'; cx.lineWidth=1.2*sc; cx.stroke();
  // Mouth
  cx.beginPath(); cx.moveTo(-4.5*sc,6*sc); cx.lineTo(4.5*sc,6*sc);
  cx.strokeStyle='rgba(100,65,45,.55)'; cx.lineWidth=1.2*sc; cx.stroke();

  // Helmet
  cx.beginPath(); cx.arc(0,-14*sc,20*sc,-Math.PI,0);
  const hg = cx.createLinearGradient(-20*sc,-34*sc,20*sc,-14*sc);
  hg.addColorStop(0,'#1a2632'); hg.addColorStop(.5,'#243444'); hg.addColorStop(1,'#161e2c');
  cx.fillStyle = hg; cx.fill();
  // Helmet band
  cx.beginPath(); cx.moveTo(-19*sc,-14*sc); cx.lineTo(19*sc,-14*sc);
  cx.strokeStyle='#222e3e'; cx.lineWidth=2*sc; cx.stroke();
  // NVG mount
  cx.beginPath(); cx.roundRect(-5.5*sc,-32*sc,11*sc,7*sc,1.5*sc);
  cx.fillStyle='#364c60'; cx.fill();
  cx.beginPath(); cx.roundRect(-3.5*sc,-30*sc,7*sc,12*sc,2*sc);
  cx.fillStyle='#283c4e'; cx.fill();
  // IR strobe
  cx.beginPath(); cx.arc(0,-26*sc,2*sc,0,Math.PI*2);
  cx.fillStyle='rgba(180,0,180,.4)'; cx.fill();
  // Ear
  cx.beginPath(); cx.ellipse(-18*sc,-2*sc,5*sc,7.5*sc,-.35,0,Math.PI*2);
  cx.fillStyle='#b08658'; cx.fill();
  cx.restore(); // head

  // ── RIFLE ──
  cx.save();
  cx.translate(10*sc, -72*sc);
  cx.rotate(-aRad);

  // Muzzle smoke
  for (let i = G.muzzleSmoke.length-1; i >= 0; i--) {
    const s = G.muzzleSmoke[i];
    s.x += s.vx; s.y += s.vy; s.r += 0.6; s.a *= 0.875;
    if (s.a < 0.01) { G.muzzleSmoke.splice(i,1); continue; }
    cx.beginPath(); cx.arc(s.x,s.y,s.r,0,Math.PI*2);
    cx.fillStyle = `rgba(190,190,190,${s.a})`; cx.fill();
  }

  // Muzzle flash
  if (G.muzzleFlash > 0) {
    G.muzzleFlash--;
    const mf = cx.createRadialGradient(-148*sc,0,0,-148*sc,0,32*sc);
    mf.addColorStop(0,`rgba(255,240,110,${G.muzzleFlash/8*.95})`);
    mf.addColorStop(.5,`rgba(255,140,30,${G.muzzleFlash/8*.55})`);
    mf.addColorStop(1,'transparent');
    cx.fillStyle = mf;
    cx.beginPath(); cx.arc(-148*sc,0,32*sc,0,Math.PI*2); cx.fill();
    // Eject spark
    cx.fillStyle = `rgba(255,180,50,${G.muzzleFlash/8*.6})`;
    cx.beginPath(); cx.arc(-135*sc,-8*sc,3*sc,0,Math.PI*2); cx.fill();
    // Spawn smoke
    for (let i = 0; i < 3; i++) G.muzzleSmoke.push({
      x: -152*sc, y: (Math.random()-.5)*9*sc,
      vx: -(2+Math.random()*3.5), vy: (Math.random()-.5)*2,
      r: 3+Math.random()*5, a: 0.38+Math.random()*.28
    });
  }

  // Suppressor
  cx.beginPath(); cx.roundRect(-162*sc,-6*sc,26*sc,12*sc,4*sc);
  cx.fillStyle='#222c3c'; cx.fill();
  cx.strokeStyle='#2e3c4e'; cx.lineWidth=0.9*sc; cx.stroke();
  // End cap
  cx.beginPath(); cx.arc(-149*sc,0,6*sc,0,Math.PI*2);
  cx.fillStyle='#181e28'; cx.fill();
  // Ports on suppressor
  for (let i=0;i<4;i++){
    cx.beginPath(); cx.moveTo((-155+i*5)*sc,-6*sc); cx.lineTo((-155+i*5)*sc,6*sc);
    cx.strokeStyle='rgba(15,22,32,.8)'; cx.lineWidth=0.8*sc; cx.stroke();
  }

  // Barrel
  cx.beginPath(); cx.roundRect(-136*sc,-4*sc,112*sc,8*sc,2.5*sc);
  const bg = cx.createLinearGradient(0,-4*sc,0,4*sc);
  bg.addColorStop(0,'#3c5060'); bg.addColorStop(.5,'#5c7080'); bg.addColorStop(1,'#2c3e50');
  cx.fillStyle=bg; cx.fill();
  // Gas block
  cx.beginPath(); cx.roundRect(-100*sc,-6*sc,8*sc,12*sc,2*sc);
  cx.fillStyle='#1c2a38'; cx.fill();

  // Handguard
  cx.beginPath(); cx.roundRect(-88*sc,-7*sc,52*sc,14*sc,3*sc);
  cx.fillStyle='#1a2630'; cx.fill();
  cx.strokeStyle='#222e3e'; cx.lineWidth=0.8*sc; cx.stroke();
  // M-LOK slots
  for (let sx=-84;sx<=-40;sx+=9){
    cx.beginPath(); cx.roundRect(sx*sc,-2*sc,5*sc,4*sc,1*sc);
    cx.fillStyle='#101820'; cx.fill();
  }

  // Receiver
  cx.beginPath(); cx.roundRect(-36*sc,-10*sc,44*sc,20*sc,3.5*sc);
  cx.fillStyle='#1c2830'; cx.fill();
  cx.strokeStyle='#222e3c'; cx.lineWidth=0.7*sc; cx.stroke();
  // Ejection port
  cx.beginPath(); cx.roundRect(-22*sc,-10*sc,16*sc,6*sc,1*sc);
  cx.fillStyle='#141c28'; cx.fill();
  // Charging handle
  cx.beginPath(); cx.roundRect(-16*sc,-14*sc,8*sc,5*sc,2*sc);
  cx.fillStyle='#263444'; cx.fill();

  // Magazine (extended)
  cx.beginPath(); cx.roundRect(-30*sc,10*sc,17*sc,24*sc,3*sc);
  cx.fillStyle='#141e2a'; cx.fill();
  cx.strokeStyle='#1e2c3a'; cx.lineWidth=0.8*sc; cx.stroke();
  // Mag ribbing
  cx.strokeStyle='rgba(30,44,60,.7)'; cx.lineWidth=0.6*sc;
  for (let my=14;my<=28;my+=4){
    cx.beginPath(); cx.moveTo(-28*sc,my*sc); cx.lineTo(-15*sc,my*sc); cx.stroke();
  }

  // Stock
  cx.beginPath();
  cx.moveTo(8*sc,-7.5*sc); cx.lineTo(44*sc,-5.5*sc);
  cx.lineTo(48*sc,-2*sc); cx.lineTo(48*sc,5.5*sc);
  cx.lineTo(44*sc,8*sc); cx.lineTo(8*sc,8*sc);
  cx.closePath();
  cx.fillStyle='#161e2c'; cx.fill();
  cx.strokeStyle='#202c3c'; cx.lineWidth=0.7*sc; cx.stroke();
  // Buffer tube
  cx.beginPath(); cx.roundRect(40*sc,-4*sc,14*sc,8*sc,4*sc);
  cx.fillStyle='#1c2834'; cx.fill();
  // Cheekrest
  cx.beginPath(); cx.roundRect(14*sc,-10*sc,24*sc,9*sc,2*sc);
  cx.fillStyle='#1a2430'; cx.fill();

  // Scope body
  cx.beginPath(); cx.roundRect(-52*sc,-18*sc,48*sc,14*sc,5.5*sc);
  cx.fillStyle='#161e2a'; cx.fill();
  cx.strokeStyle='#202c3c'; cx.lineWidth=1.2*sc; cx.stroke();
  // Top turret
  cx.beginPath(); cx.roundRect(-38*sc,-24*sc,10*sc,8*sc,2.5*sc);
  cx.fillStyle='#1e2c3c'; cx.fill();
  cx.strokeStyle='#283a4c'; cx.lineWidth=0.7*sc; cx.stroke();
  // Side turret
  cx.beginPath(); cx.roundRect(-38*sc,11*sc,10*sc,8*sc,2.5*sc);
  cx.fillStyle='#1e2c3c'; cx.fill();
  // Scope front lens
  cx.beginPath(); cx.arc(-48*sc,-11*sc,5.5*sc,0,Math.PI*2);
  const lg = cx.createRadialGradient(-48*sc,-11*sc,0,-48*sc,-11*sc,5.5*sc);
  lg.addColorStop(0,'rgba(130,190,255,.9)'); lg.addColorStop(.5,'rgba(60,120,220,.7)');
  lg.addColorStop(1,'rgba(15,38,90,.9)');
  cx.fillStyle=lg; cx.fill();
  cx.strokeStyle='rgba(80,140,220,.45)'; cx.lineWidth=1.1*sc; cx.stroke();
  // Scope rear lens
  cx.beginPath(); cx.arc(-6*sc,-11*sc,4.5*sc,0,Math.PI*2);
  cx.fillStyle='rgba(25,55,110,.85)'; cx.fill();
  // scope reticle removed

  // Bipod
  if (G.sniperAngle > 50) {
    cx.strokeStyle='#222e3e'; cx.lineWidth=2.2*sc;
    cx.lineCap='round';
    cx.beginPath(); cx.moveTo(-94*sc,4*sc); cx.lineTo(-86*sc,28*sc); cx.stroke();
    cx.beginPath(); cx.moveTo(-76*sc,4*sc); cx.lineTo(-68*sc,28*sc); cx.stroke();
    for (const bx of [-86,-68]) {
      cx.beginPath(); cx.roundRect(bx*sc,24*sc,12*sc,5*sc,3*sc);
      cx.fillStyle='#181e28'; cx.fill();
    }
    cx.lineCap='butt';
  }

  cx.restore(); // rifle
  cx.restore(); // sniper
}

function drawLaser() { /* removed */ }

// ════════════════════════════════════════
//  BULLET TRACER
// ════════════════════════════════════════
function drawBullet() {
  if (G.bulletFlash <= 0) return;
  G.bulletFlash--;
  const prog = 1 - G.bulletFlash/6;
  const sX = W*.84, tX = G.jarX;
  const bX = sX + (tX-sX)*prog;
  const bY = G.sniperY - 12;
  // Trail
  const tg = cx.createLinearGradient(bX-70,bY,bX,bY);
  tg.addColorStop(0,'transparent');
  tg.addColorStop(1,'rgba(255,215,90,.6)');
  cx.beginPath(); cx.moveTo(bX-80,bY); cx.lineTo(bX,bY);
  cx.strokeStyle=tg; cx.lineWidth=3.5; cx.stroke();
  // Tip glow
  cx.beginPath(); cx.arc(bX,bY,5,0,Math.PI*2);
  cx.fillStyle='rgba(255,235,130,.95)'; cx.fill();
  cx.beginPath(); cx.arc(bX,bY,10,0,Math.PI*2);
  cx.fillStyle='rgba(255,185,60,.18)'; cx.fill();
}

function drawScope() { /* removed — crash is a surprise */ }

// ════════════════════════════════════════
//  MAIN LOOP
// ════════════════════════════════════════
function drawFrame() {
  if (W===0||H===0){requestAnimationFrame(drawFrame);return;}
  const jarSc  = Math.min(H*.0033, W*.0022);
  const sniSc  = Math.min(H*.0025, W*.0018);
  G.jarX    = W * .13;
  G.jarY    = H * .77;
  G.sniperY = H * .75;

  drawBG();
  drawJar(G.jarX, G.jarY, jarSc);
  drawLaser();
  drawBullet();
  drawSniper(W * .84, G.sniperY, sniSc);
  drawScope();
  requestAnimationFrame(drawFrame);
}
requestAnimationFrame(drawFrame);
