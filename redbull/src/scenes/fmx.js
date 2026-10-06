// 05 — FMX. Flat geometric jump: motion path with keyframes, a backflip with
// squash on landing, then the camera pulls back to a 5×5 grid of tricks that
// flip to snow white.
import { W, H, BEAT, E, PAL, TAU, prog, lerp, spring, wobble, shake, hash, circle, layout } from '../util.js';

const GY = 860;
const LIP = { x: 560, y: GY - 180 }, A0 = Math.atan2(-180, 310);
const A1 = Math.atan2(160, 360);
const LAND = { x: 1360, y: GY - 160 + (160 * 80) / 360 };
const TAKE = 0.12, TOUCH = BEAT * 2, APEX = 380;

const V = [
  { bg: PAL.paper, ramp: PAL.navy, type: PAL.yellow, frame: PAL.red, rider: PAL.navy, helmet: PAL.yellow, line: PAL.navy },
  { bg: PAL.navy, ramp: PAL.silver, type: PAL.blue2, frame: PAL.yellow, rider: PAL.white, helmet: PAL.red, line: PAL.white },
  { bg: PAL.yellow, ramp: PAL.navy, type: PAL.white, frame: PAL.red, rider: PAL.navy, helmet: PAL.white, line: PAL.navy },
  { bg: PAL.red, ramp: PAL.navy, type: '#FF6B83', frame: PAL.yellow, rider: PAL.white, helmet: PAL.navy, line: PAL.white },
  { bg: PAL.silver, ramp: PAL.navy, type: PAL.white, frame: PAL.blue2, rider: PAL.navy, helmet: PAL.red, line: PAL.navy },
  { bg: PAL.blue2, ramp: PAL.navy, type: PAL.yellow, frame: PAL.white, rider: PAL.navy, helmet: PAL.yellow, line: PAL.white },
];
const TRICKS = [{ turns: 1 }, { turns: -1 }, { turns: 2 }, { turns: 0, spin: true }, { turns: 1, spin: true }];

function state(l, tr) {
  if (l < 0) {
    const x = 330 + 1500 * l;
    return { x, y: x < 250 ? GY : GY - (180 * (x - 250)) / 310, a: x < 250 ? 0 : A0 };
  }
  if (l < TAKE) {
    const x = lerp(330, LIP.x, l / TAKE);
    return { x, y: GY - (180 * (x - 250)) / 310, a: A0 };
  }
  if (l < TOUCH) {
    const s = (l - TAKE) / (TOUCH - TAKE), e = E.inOutCubic(s);
    return {
      x: lerp(LIP.x, LAND.x, s), y: lerp(LIP.y, LAND.y, s) - 4 * APEX * s * (1 - s),
      a: lerp(A0, A1, e) - TAU * tr.turns * e, spin: tr.spin ? e : 0, s,
    };
  }
  const d = l - TOUCH, x = LAND.x + 600 * d - 140 * d * d;
  if (x < 1640) return { x, y: GY - 160 + (160 * (x - 1280)) / 360, a: A1, d };
  return { x, y: GY, a: A1 * Math.max(0, 1 - (x - 1640) / 60), d };
}

function bike(ctx, st, v, squash) {
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.rotate(st.a);
  if (st.spin) ctx.scale(Math.cos(TAU * st.spin), 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = v.ramp === PAL.silver ? PAL.silver : PAL.navy;
  ctx.lineWidth = 12;
  [-62, 62].forEach(x => { circle(ctx, x, -36, 33); ctx.stroke(); ctx.fillStyle = v.helmet; circle(ctx, x, -36, 8); ctx.fill(); });
  ctx.save();
  ctx.translate(0, -36); ctx.scale(1, 1 - 0.22 * squash); ctx.translate(0, 36);
  ctx.strokeStyle = v.frame; ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(-62, -36); ctx.lineTo(-14, -84); ctx.lineTo(44, -88); ctx.lineTo(62, -36);
  ctx.moveTo(-14, -84); ctx.lineTo(8, -48); ctx.lineTo(-62, -36);
  ctx.stroke();
  ctx.fillStyle = v.frame;
  ctx.beginPath(); ctx.roundRect(36, -116, 30, 26, 6); ctx.fill();
  ctx.strokeStyle = v.rider; ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(-8, -98); ctx.lineTo(14, -70); ctx.lineTo(2, -50);
  ctx.moveTo(-8, -98); ctx.lineTo(12, -148);
  ctx.moveTo(12, -142); ctx.lineTo(38, -120); ctx.lineTo(46, -100);
  ctx.stroke();
  ctx.fillStyle = v.helmet;
  circle(ctx, 24, -170, 20); ctx.fill();
  ctx.fillStyle = v.rider;
  ctx.fillRect(28, -176, 18, 8);
  ctx.restore();
  ctx.restore();
}

function comp(ctx, l, v, tr, hero) {
  ctx.fillStyle = v.bg;
  ctx.fillRect(0, 0, W, H);
  const rise = hero ? (1 - E.outExpo(prog(l, 0, 0.3))) * 360 : 0;
  ctx.save();
  ctx.translate(0, rise);

  // big type behind
  ctx.save();
  ctx.font = '400 600px "Archivo Black"';
  const L = layout(ctx, 'AIR');
  const x0 = (W - L.total) / 2;
  ctx.fillStyle = v.type;
  ctx.beginPath(); ctx.rect(0, 0, W, GY); ctx.clip();
  L.chars.forEach((c, i) => {
    const p = E.outExpo(prog(l, 0.04 + i * 0.05, 0.5 + i * 0.05));
    ctx.fillText(c.ch, x0 + c.x, GY - 30 + (1 - p) * 560);
  });
  ctx.restore();

  // ramps + ground
  ctx.fillStyle = v.ramp;
  ctx.beginPath(); ctx.moveTo(250, GY); ctx.lineTo(560, GY); ctx.lineTo(560, GY - 180); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1280, GY - 160); ctx.lineTo(1640, GY); ctx.lineTo(1280, GY); ctx.closePath(); ctx.fill();
  ctx.fillRect(0, GY, W, 12);

  // motion path with keyframes
  const draw = E.outExpo(prog(l, -0.1, 0.25));
  const st = state(l, tr);
  const P = s => ({ x: lerp(LIP.x, LAND.x, s), y: lerp(LIP.y, LAND.y, s) - 4 * APEX * s * (1 - s) - 40 });
  ctx.save();
  ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.strokeStyle = v.line; ctx.globalAlpha = 0.45;
  ctx.beginPath();
  for (let k = 0; k <= 40 * draw; k++) { const p = P(k / 40); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
  ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  if (st.s !== undefined || l >= TOUCH) {
    const sNow = l >= TOUCH ? 1 : st.s;
    ctx.strokeStyle = PAL.red; ctx.lineWidth = 6;
    ctx.beginPath();
    for (let k = 0; k <= 40 * sNow; k++) { const p = P(k / 40); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    ctx.stroke();
  }
  ctx.font = '500 17px "JetBrains Mono"'; ctx.letterSpacing = '2px'; ctx.fillStyle = v.line;
  [[0, 'T+00'], [0.5, 'APEX · 12 M'], [1, 'T+38']].forEach(([s, lab], i) => {
    const pk = spring(l + 0.1 - i * 0.08, 4, 0.4);
    if (pk <= 0 || s > draw + 0.001) return;
    const p = P(s);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4); ctx.scale(pk, pk);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
    ctx.fillText(lab, p.x + 18, p.y - 18);
  });
  ctx.restore();

  // landing dust
  if (st.d !== undefined) {
    const d = st.d;
    for (let k = 0; k < 16; k++) {
      const vx = (hash(k * 3.1) - 0.3) * 500, vy = -(150 + hash(k * 5.3) * 380);
      const x = LAND.x + vx * d, y = LAND.y + vy * d + 900 * d * d;
      const a = Math.max(0, 1 - d / 0.5);
      if (a <= 0) continue;
      ctx.fillStyle = v.ramp; ctx.globalAlpha = a;
      circle(ctx, x, y, 4 + 8 * hash(k)); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  bike(ctx, st, v, wobble(l - TOUCH, 10, 30));
  ctx.restore();
}

export function fmx(ctx, lt) {
  const z = E.inOutExpo(prog(lt, TOUCH, TOUCH + 0.32));
  if (z <= 0) {
    const sh = shake(lt, TOUCH, 20, 12, 4);
    ctx.save(); ctx.translate(sh.x, sh.y);
    comp(ctx, lt, V[0], TRICKS[0], true);
    ctx.restore();
    ctx.save();
    ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '3px'; ctx.fillStyle = PAL.navy;
    ctx.fillText('FMX — BACKFLIP', 96, 170);
    ctx.fillText(`AIRTIME ${Math.min(0.63, Math.max(0, lt - TAKE)).toFixed(2).replace('.', ',')} S`, 96, 202);
    ctx.restore();
    return;
  }
  const s = lerp(1, 0.2, z);
  ctx.fillStyle = PAL.navy;
  ctx.fillRect(0, 0, W, H);
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < 5; i++) {
      const gi = i - 2, gj = j - 2;
      const cx = W / 2 + gi * W * s, cy = H / 2 + gj * H * s;
      if (cx + (W * s) / 2 < 0 || cx - (W * s) / 2 > W || cy + (H * s) / 2 < 0 || cy - (H * s) / 2 > H) continue;
      const d = Math.hypot(gi, gj);
      const f0 = BEAT * 3 + (i + j) * 0.03;
      const flip = prog(lt, f0, f0 + 0.13);
      if (flip > 0) {
        ctx.fillStyle = '#F4F9FF';
        ctx.fillRect(cx - (W * s) / 2 - 1, cy - (H * s) / 2 - 1, W * s + 2, H * s + 2);
      }
      const fx = 1 - E.inCubic(flip);
      if (fx > 0.01) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s * fx, s);
        const g = (5 / s) * z;
        ctx.beginPath(); ctx.rect(-W / 2 + g, -H / 2 + g, W - 2 * g, H - 2 * g); ctx.clip();
        ctx.translate(-W / 2, -H / 2);
        const k = (i * 3 + j * 2) % 5;
        comp(ctx, lt - (d === 0 ? 0 : 0.42 + d * 0.1), d === 0 ? V[0] : V[k + 1], d === 0 ? TRICKS[0] : TRICKS[k], d === 0);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(lt * 2);
        ctx.strokeStyle = '#9FC8F0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let a = 0; a < 3; a++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke(); }
        ctx.restore();
      }
    }
  }
}
