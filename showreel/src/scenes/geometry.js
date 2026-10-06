// 03 — Shape & timing. A Bauhaus composition built on the beat, then the camera
// pulls back to reveal it is one tile in a system of variations.
import { W, H, BEAT, E, PAL, GROUND_Y, BALL_R, TAU, prog, lerp, spring, wobble, circle } from '../util.js';

const V = [
  { bg: PAL.cream, ball: PAL.red, sq: PAL.bBlue, tri: PAL.bYellow, ink: PAL.bInk, dot: PAL.bBlue },
  { bg: PAL.bBlue, ball: PAL.bYellow, sq: PAL.cream, tri: PAL.bRed, ink: PAL.cream, dot: PAL.bYellow },
  { bg: PAL.bRed, ball: PAL.cream, sq: PAL.bInk, tri: PAL.bYellow, ink: PAL.bInk, dot: PAL.cream },
  { bg: PAL.bYellow, ball: PAL.bBlue, sq: PAL.bRed, tri: PAL.bInk, ink: PAL.bInk, dot: PAL.bRed },
  { bg: PAL.bInk, ball: PAL.bRed, sq: PAL.bYellow, tri: PAL.bBlue, ink: PAL.cream, dot: PAL.bYellow },
  { bg: PAL.cream, ball: PAL.bBlue, sq: PAL.bRed, tri: PAL.bInk, ink: PAL.bInk, dot: PAL.bRed },
];

const SQ = 230, TRI = 300;
const LANDY = GROUND_Y - 7 - BALL_R;

function comp(ctx, l, v) {
  ctx.fillStyle = v.bg;
  ctx.fillRect(0, 0, W, H);

  // half disc under the ground line
  const hd = 300 * E.outBack(prog(l, 0.7, 1.05), 2);
  if (hd > 0) {
    ctx.fillStyle = v.ink;
    ctx.beginPath(); ctx.arc(W / 2, GROUND_Y, hd, 0, Math.PI); ctx.fill();
  }
  // ground bar grows out of the impact
  const hw = 780 * E.outExpo(prog(l, 0, 0.45));
  if (hw > 0) { ctx.fillStyle = v.ink; ctx.fillRect(W / 2 - hw, GROUND_Y - 7, hw * 2, 14); }

  // impact ripples
  for (let k = 0; k < 2; k++) {
    const q = prog(l, k * 0.07, 0.6 + k * 0.07);
    if (q <= 0 || q >= 1) continue;
    ctx.strokeStyle = v.ink; ctx.globalAlpha = 1 - q; ctx.lineWidth = 4 * (1 - q) + 1;
    circle(ctx, W / 2, LANDY, BALL_R + 280 * E.outCubic(q)); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // diagonal bar from the top right
  const dl = E.outExpo(prog(l, 0.8, 1.15));
  if (dl > 0) {
    ctx.strokeStyle = v.ink; ctx.lineWidth = 12; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(1500, 150); ctx.lineTo(lerp(1500, 1780, dl), lerp(150, 430, dl)); ctx.stroke();
  }
  // dot row
  for (let k = 0; k < 6; k++) {
    const s = spring(l - 0.58 - k * 0.035, 3.5, 0.35);
    if (s <= 0) continue;
    ctx.fillStyle = k % 2 ? v.dot : v.ink;
    circle(ctx, 300 + k * 64, 250, 20 * s); ctx.fill();
  }

  // blue square slides in and settles with an overshoot
  const ps = prog(l, BEAT / 2, BEAT / 2 + 0.42);
  if (ps > 0) {
    const fx = W / 2 - 470;
    const x = lerp(-300, fx, E.outExpo(ps));
    const rot = (1 - spring(l - BEAT / 2, 2.4, 0.33)) * -Math.PI / 2;
    ctx.save();
    ctx.translate(x + SQ / 2, GROUND_Y - 7);
    ctx.rotate(rot);
    ctx.fillStyle = v.sq;
    ctx.fillRect(-SQ, -SQ, SQ, SQ);
    ctx.restore();
  }

  // triangle drops and bounces
  const pt = prog(l, BEAT, BEAT + 0.5);
  if (pt > 0) {
    const fy = GROUND_Y - 7;
    const y = lerp(-200, fy, E.outBounce(pt));
    const th = TRI * Math.sqrt(3) / 2;
    ctx.save();
    ctx.translate(W / 2 + 480, y);
    ctx.rotate((1 - E.outCubic(pt)) * 0.9);
    ctx.fillStyle = v.tri;
    ctx.beginPath(); ctx.moveTo(-TRI / 2, 0); ctx.lineTo(TRI / 2, 0); ctx.lineTo(0, -th); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ball: falls in (for tiles that start early), squashes, then hops on the beat
  let y = LANDY, sx = 1, sy = 1;
  if (l < 0) {
    y = LANDY - 5200 * l * l;
    sy = 1.15; sx = 0.9;
  } else {
    const k = wobble(l, 9, 30);
    sx = 1 + 0.36 * k; sy = 1 - 0.36 * k;
    const hp = prog(l, BEAT, BEAT + 0.3);
    if (hp > 0 && hp < 1) {
      y -= Math.sin(Math.PI * hp) * 150;
      const st = Math.abs(Math.cos(Math.PI * hp)) * 0.14;
      sx *= 1 - st; sy *= 1 + st;
    }
    const k2 = wobble(l - BEAT - 0.3, 12, 34);
    sx *= 1 + 0.2 * k2; sy *= 1 - 0.2 * k2;
  }
  if (y + BALL_R > -50) {
    ctx.save();
    ctx.translate(W / 2, y + BALL_R);
    ctx.scale(sx, sy);
    ctx.fillStyle = v.ball;
    circle(ctx, 0, -BALL_R, BALL_R); ctx.fill();
    ctx.restore();
  }
}

export const TILE_DOTS = [];
for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) TILE_DOTS.push({ x: W / 2 + (i - 2) * W / 5, y: H / 2 + (j - 2) * H / 5, k: i + j });

export function geometry(ctx, lt) {
  const z = E.inOutExpo(prog(lt, BEAT * 2, BEAT * 2 + 0.6));
  if (z <= 0) { comp(ctx, lt, V[0]); return; }
  const s = lerp(1, 0.2, z);
  ctx.fillStyle = PAL.night;
  ctx.fillRect(0, 0, W, H);
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < 5; i++) {
      const gi = i - 2, gj = j - 2;
      const cx = W / 2 + gi * W * s, cy = H / 2 + gj * H * s;
      if (cx + W * s / 2 < 0 || cx - W * s / 2 > W || cy + H * s / 2 < 0 || cy - H * s / 2 > H) continue;
      const d = Math.hypot(gi, gj);
      const delay = d === 0 ? 0 : 0.5 + d * 0.11;
      const f0 = BEAT * 3 + (i + j) * 0.034;
      const flip = prog(lt, f0, f0 + 0.15);
      const fx = 1 - E.inCubic(flip);
      if (fx > 0.01) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s * fx, s);
        const g = (5 / s) * z;
        ctx.beginPath(); ctx.rect(-W / 2 + g, -H / 2 + g, W - 2 * g, H - 2 * g); ctx.clip();
        ctx.translate(-W / 2, -H / 2);
        comp(ctx, lt - delay, d === 0 ? V[0] : V[(i * 3 + j * 2) % 5 + 1]);
        ctx.restore();
      }
      if (flip > 0) {
        const col = (i + j) % 2 ? '255,43,214' : '46,242,255';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
        gr.addColorStop(0, `rgba(255,255,255,${flip})`);
        gr.addColorStop(0.15, `rgba(${col},${flip})`);
        gr.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = gr;
        circle(ctx, cx, cy, 40); ctx.fill();
        ctx.restore();
      }
    }
  }
}
