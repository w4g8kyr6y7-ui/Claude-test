// 04 — Wingsuit. Free fall through three parallax cloud layers, red & yellow
// smoke trails left in the air, altitude ticking down, then a whip-pan to the ground.
import { W, H, BEAT, E, PAL, TAU, prog, lerp, clamp, hash, circle, makeCanvas, layout, scramble } from '../util.js';

let C = null, S = null, T = null;
const LAYERS = [
  { n: 8, v: 260, s: 0.55, blur: 5, alpha: 0.55, seed: 1 },
  { n: 6, v: 900, s: 1.0, blur: 10, alpha: 0.8, seed: 2 },
  { n: 3, v: 2700, s: 2.2, blur: 30, alpha: 0.7, seed: 3 },
];
const AIR = 820; // how fast the air (and the smoke left in it) rises past us

function clouds(ctx, lt, L) {
  const c = C.x;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#fff';
  for (let i = 0; i < L.n; i++) {
    const sd = L.seed * 100 + i;
    const span = H + 700 * L.s;
    const y = (((hash(sd) * span - L.v * lt) % span) + span) % span - 350 * L.s;
    const x = hash(sd + 0.5) * (W + 600) - 300 - L.v * 0.3 * lt;
    for (let k = 0; k < 8; k++) {
      const ox = (hash(sd * 13 + k) - 0.5) * 380 * L.s, oy = (hash(sd * 17 + k) - 0.5) * 100 * L.s;
      circle(c, x + ox, y + oy, (60 + hash(sd * 19 + k) * 80) * L.s);
      c.fill();
    }
  }
  ctx.save();
  ctx.globalAlpha = L.alpha;
  ctx.filter = `blur(${L.blur}px)`;
  ctx.drawImage(C.c, 0, 0);
  ctx.restore();
}

function pos(t) {
  const e = E.outExpo(prog(t, 0, 0.45));
  return {
    x: lerp(-250, 720, e) + 260 * prog(t, 0.45, 1.5) + 36 * Math.sin(t * 5),
    y: lerp(-300, 400, e) + 46 * Math.sin(t * 3.3) + 70 * prog(t, 0.45, 1.5),
  };
}
const HEAD = Math.atan2(1, 0.45) + Math.PI / 2;
const angle = t => HEAD + 0.14 * Math.sin(t * 4.2);

function suit(ctx, t) {
  const p = pos(t);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle(t));
  ctx.scale(1.8 * (0.84 + 0.16 * Math.cos(t * 4.2)), 1.8);
  ctx.fillStyle = PAL.navy;
  ctx.beginPath();
  ctx.moveTo(0, -62); ctx.lineTo(-30, -52); ctx.lineTo(-112, 4);
  ctx.quadraticCurveTo(-84, 18, -64, 40); ctx.lineTo(-34, 22); ctx.lineTo(-30, 88); ctx.lineTo(-10, 112);
  ctx.lineTo(0, 92); ctx.lineTo(10, 112); ctx.lineTo(30, 88); ctx.lineTo(34, 22); ctx.lineTo(64, 40);
  ctx.quadraticCurveTo(84, 18, 112, 4); ctx.lineTo(30, -52); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PAL.red; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-26, -46); ctx.lineTo(-100, 6); ctx.moveTo(26, -46); ctx.lineTo(100, 6); ctx.stroke();
  ctx.fillStyle = '#24336E';
  ctx.beginPath(); ctx.roundRect(-16, -56, 32, 96, 14); ctx.fill();
  ctx.strokeStyle = '#24336E'; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(-8, 34); ctx.lineTo(-10, 104); ctx.moveTo(8, 34); ctx.lineTo(10, 104); ctx.stroke();
  ctx.fillStyle = PAL.yellow;
  circle(ctx, 0, -78, 18); ctx.fill();
  ctx.fillStyle = PAL.red;
  ctx.fillRect(-18, -80, 36, 6);
  ctx.restore();
}

function smoke(ctx, lt) {
  const s = S.x;
  s.clearRect(0, 0, W, H);
  s.lineCap = 'round';
  [[-10, PAL.red], [10, PAL.yellow]].forEach(([fx, col]) => {
    let prev = null;
    for (let k = 0; k <= 46; k++) {
      const te = lt - k * 0.018;
      if (te < 0.12) break;
      const p = pos(te), a = angle(te), age = lt - te;
      const lx = fx * 1.8, ly = 112 * 1.8;
      const x = p.x + lx * Math.cos(a) - ly * Math.sin(a) - AIR * 0.3 * age;
      const y = p.y + lx * Math.sin(a) + ly * Math.cos(a) - AIR * age;
      if (prev) {
        s.strokeStyle = col;
        s.globalAlpha = 0.9 * Math.pow(Math.max(0, 1 - age / 0.85), 1.2);
        s.lineWidth = 10 + 110 * age;
        s.beginPath(); s.moveTo(prev.x, prev.y); s.lineTo(x, y); s.stroke();
      }
      prev = { x, y };
    }
  });
  s.globalAlpha = 1;
  ctx.save();
  ctx.filter = 'blur(9px)';
  ctx.drawImage(S.c, 0, 0);
  ctx.restore();
}

export function wingsuit(ctx, lt) {
  if (!C) { C = makeCanvas(); S = makeCanvas(); T = makeCanvas(); }
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#163A8F'); sky.addColorStop(0.5, '#4C84D6'); sky.addColorStop(0.85, '#F3C7A2'); sky.addColorStop(1, '#FFE2B6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const sx = 1480, sy = 860 - 120 * lt;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(sx, sy, 60, sx, sy, 520);
  g.addColorStop(0, 'rgba(255,194,14,0.6)'); g.addColorStop(1, 'rgba(255,194,14,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.fillStyle = PAL.yellow;
  circle(ctx, sx, sy, 96); ctx.fill();

  clouds(ctx, lt, LAYERS[0]);
  clouds(ctx, lt, LAYERS[1]);
  smoke(ctx, lt);
  suit(ctx, lt);
  clouds(ctx, lt, LAYERS[2]);

  // type & readouts
  ctx.save();
  ctx.font = '400 210px Anton'; ctx.letterSpacing = '4px';
  const L = layout(ctx, 'CHUTE LIBRE');
  L.chars.forEach((c, i) => {
    const p = prog(lt, BEAT + i * 0.022, BEAT + i * 0.022 + 0.3);
    if (p <= 0) return;
    const y = 940 - (1 - E.outBack(p, 1.6)) * 420;
    ctx.fillStyle = 'rgba(10,19,53,0.25)';
    ctx.fillText(c.ch, 96 + c.x + 8, y + 10);
    ctx.fillStyle = PAL.white;
    ctx.fillText(c.ch, 96 + c.x, y);
  });
  ctx.restore();

  const alt = Math.max(0, 4000 - 2200 * (lt / 1.5));
  const altS = `${Math.floor(alt / 1000)} ${String(Math.floor(alt % 1000)).padStart(3, '0')} M`;
  const ra = E.outExpo(prog(lt, 0.15, 0.5));
  ctx.save();
  ctx.globalAlpha = ra;
  ctx.shadowColor = 'rgba(10,19,53,0.55)'; ctx.shadowBlur = 26;
  ctx.textAlign = 'right';
  ctx.fillStyle = PAL.white;
  ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '4px';
  ctx.fillText(scramble('ALTITUDE', ra, lt, 1), W - 96, 200);
  ctx.fillText(scramble('VITESSE · CHUTE LIBRE', ra, lt, 2), W - 96, 380);
  ctx.font = '900 104px Unbounded'; ctx.letterSpacing = '0px';
  ctx.fillText(altS, W - 96 + (1 - ra) * 200, 310);
  ctx.font = '900 64px Unbounded';
  ctx.fillText(`${Math.round(180 + 45 * prog(lt, 0, 1.2))} KM/H`, W - 96 + (1 - ra) * 300, 460);
  ctx.restore();

  // whip-pan down to the FMX scene
  const wp = E.inCubic(prog(lt, 1.3, 1.5));
  if (wp > 0) {
    T.x.clearRect(0, 0, W, H);
    T.x.drawImage(ctx.canvas, 0, 0);
    ctx.fillStyle = PAL.paper;
    ctx.fillRect(0, 0, W, H);
    for (let k = 4; k >= 0; k--) {
      ctx.globalAlpha = k === 0 ? 1 : 0.18;
      ctx.drawImage(T.c, 0, -wp * H * 1.1 + k * wp * 70);
    }
    ctx.globalAlpha = 1;
  }
}
