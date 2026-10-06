// 02 — Kinetic type. One word per beat: I MAKE / THINGS / MOVE.
// The period of MOVE. is the ball that lands in the next scene.
import { W, H, BEAT, E, PAL, GROUND_Y, BALL_R, prog, lerp, clamp, wobble, shake, layout, circle } from '../util.js';

const capCache = {};
function capH(ctx, font) {
  if (!(font in capCache)) {
    ctx.save(); ctx.font = font;
    capCache[font] = ctx.measureText('H').actualBoundingBoxAscent;
    ctx.restore();
  }
  return capCache[font];
}

function wordMake(ctx, l) {
  ctx.fillStyle = PAL.red;
  ctx.fillRect(0, 0, W, H);
  const sh = shake(l, 0, 26, 10, 1);
  ctx.save();
  ctx.translate(sh.x, sh.y);
  const F = '400 500px Anton';
  ctx.font = F;
  ctx.letterSpacing = '6px';
  const lay = layout(ctx, 'I MAKE');
  const ch = capH(ctx, F);
  const x0 = (W - lay.total) / 2, base = H / 2 + ch / 2;
  // outline echoes on the off-beat
  for (let k = 0; k < 3; k++) {
    const q = prog(l, BEAT / 2 + k * 0.045, BEAT / 2 + k * 0.045 + 0.32);
    if (q <= 0 || q >= 1) continue;
    const s = 1 + 0.38 * E.outCubic(q);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
    ctx.strokeStyle = `rgba(255,255,255,${(1 - q) * 0.9})`;
    ctx.lineWidth = 3 / s;
    ctx.strokeText('I MAKE', x0, base);
    ctx.restore();
  }
  lay.chars.forEach((c, i) => {
    if (c.ch === ' ') return;
    const t0 = i * 0.026;
    const p = prog(l, t0, t0 + 0.2);
    if (p <= 0) return;
    const cx = x0 + c.x + c.w / 2, cy = base - ch / 2;
    for (let g = 3; g >= 0; g--) {
      const pg = clamp(p - g * 0.06);
      if (pg <= 0) continue;
      const s = lerp(2.8, 1, E.outExpo(pg));
      ctx.globalAlpha = (g === 0 ? 1 : 0.2 * (1 - g / 4)) * clamp(p * 4);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(s, s);
      ctx.fillStyle = '#fff';
      ctx.fillText(c.ch, -c.w / 2, ch / 2);
      ctx.restore();
    }
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function wordThings(ctx, l) {
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(0, 0, W, H);
  // marquee rows of outlined text
  ctx.save();
  ctx.font = '900 150px Unbounded';
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255,255,255,${0.16 * E.outCubic(prog(l, 0, 0.15))})`;
  const row = 'THINGS — THINGS — THINGS — ';
  const rw = ctx.measureText(row).width;
  for (let r = 0; r < 8; r++) {
    const dir = r % 2 ? 1 : -1;
    let x = (dir * (l * 1500 + 400 * E.outExpo(prog(l, 0, 0.3))) + r * 313) % rw;
    if (x > 0) x -= rw;
    const y = 30 + r * 160;
    ctx.strokeText(row, x, y);
    ctx.strokeText(row, x + rw, y);
  }
  ctx.restore();

  const sh = shake(l, 0, 14, 12, 2);
  ctx.save();
  ctx.translate(sh.x, sh.y);
  const F = '900 260px Unbounded';
  ctx.font = F;
  const lay = layout(ctx, 'THINGS');
  const ch = capH(ctx, F);
  const x0 = (W - lay.total) / 2, base = H / 2 + ch / 2;
  // red underline sweep
  const u = E.outExpo(prog(l, 0.1, 0.4));
  ctx.fillStyle = PAL.red;
  ctx.fillRect(x0, base + 46, lay.total * u, 26);
  ctx.fillStyle = '#fff';
  lay.chars.forEach((c, i) => {
    const t0 = i * 0.03;
    const p = prog(l, t0, t0 + 0.3);
    if (p <= 0) return;
    const sy = E.outBack(p, 2.6);
    ctx.save();
    ctx.translate(x0 + c.x + c.w / 2, base - ch / 2 + (1 - E.outExpo(p)) * 120);
    ctx.rotate((1 - E.outExpo(p)) * -0.25);
    ctx.scale(1, sy);
    ctx.fillText(c.ch, -c.w / 2, ch / 2);
    ctx.restore();
  });
  ctx.restore();
}

// Ball path from the period of MOVE. to its landing spot in the geometry scene.
export const LAND = { x: W / 2, y: GROUND_Y - 7 - BALL_R };

function wordMove(ctx, l) {
  const lt3 = l - BEAT; // transition clock
  ctx.fillStyle = PAL.yellow;
  ctx.fillRect(0, 0, W, H);
  const F = '400 660px Anton';
  ctx.font = F;
  ctx.letterSpacing = '4px';
  const lay = layout(ctx, 'MOVE');
  const ch = capH(ctx, F);
  const r = 54, gap = 30;
  const x0 = (W - (lay.total + gap + 2 * r)) / 2, base = H / 2 + ch / 2 + 10;
  const sh = shake(l, 0.12, 16, 12, 3);
  ctx.save();
  ctx.translate(sh.x, sh.y);
  ctx.fillStyle = PAL.ink;
  lay.chars.forEach((c, i) => {
    const tl = i * 0.04;
    const pf = prog(l, tl, tl + 0.12);
    if (pf <= 0) return;
    let yo = -(1 - E.inQuad(pf)) * 900;
    let sy = pf < 1 ? 1.25 : 1, sx = pf < 1 ? 0.86 : 1;
    const k = wobble(l - tl - 0.12, 10, 36);
    sy *= 1 - 0.3 * k; sx *= 1 + 0.22 * k;
    // little follow-up hop on the off-beat
    const hp = prog(l, BEAT / 2 + i * 0.04, BEAT / 2 + i * 0.04 + 0.16);
    yo -= Math.sin(Math.PI * hp) * 70;
    // anticipation, then launch
    if (lt3 > 0) {
      const a = E.outQuad(prog(lt3, 0, 0.08));
      const p2 = prog(lt3, 0.08 + i * 0.03, 0.08 + i * 0.03 + 0.24);
      sy *= (1 - 0.18 * a * (1 - p2)) * (1 + 1.1 * E.inCubic(p2));
      sx *= 1 - 0.35 * E.inCubic(p2);
      yo -= E.inCubic(p2) * 1700;
    }
    ctx.save();
    ctx.translate(x0 + c.x + c.w / 2, base + yo);
    ctx.scale(sx, sy);
    ctx.fillText(c.ch, -c.w / 2, 0);
    ctx.restore();
  });
  ctx.restore();

  // cream curtain rising into the geometry scene
  if (lt3 > 0) {
    const yb = H + 260 - E.inOutExpo(prog(lt3, 0.1, 0.42)) * (H + 560);
    ctx.fillStyle = PAL.cream;
    ctx.beginPath();
    ctx.moveTo(0, yb + 200); ctx.lineTo(W, yb - 60); ctx.lineTo(W, H + 10); ctx.lineTo(0, H + 10);
    ctx.fill();
  }

  // the period / ball
  const P0 = { x: x0 + lay.total + gap + r, y: base - r };
  const tl = 4 * 0.04 + 0.02;
  const pf = prog(l, tl, tl + 0.12);
  if (pf <= 0) return;
  let x = P0.x, y = P0.y - (1 - E.inQuad(pf)) * 900, rad = r, sx = 1, sy = 1;
  const k = wobble(l - tl - 0.12, 10, 34);
  sx += 0.3 * k; sy -= 0.3 * k;
  if (lt3 > 0) {
    const a = E.outQuad(prog(lt3, 0, 0.08));
    sy *= 1 - 0.25 * a; sx *= 1 + 0.2 * a;
    const s = prog(lt3, 0.08, BEAT);
    if (s > 0) {
      x = lerp(P0.x, LAND.x, s);
      y = lerp(P0.y, LAND.y, s) - 4 * 480 * s * (1 - s);
      rad = lerp(r, BALL_R, E.inOutCubic(s));
      sx = 1 - 0.12 * Math.sin(Math.PI * s); sy = 1 + 0.12 * Math.sin(Math.PI * s);
    }
  }
  ctx.save();
  ctx.translate(x, y + rad);
  ctx.scale(sx, sy);
  ctx.fillStyle = PAL.red;
  circle(ctx, 0, -rad, rad);
  ctx.fill();
  ctx.restore();
}

export function kinetic(ctx, lt) {
  if (lt < BEAT) wordMake(ctx, lt);
  else if (lt < BEAT * 2) wordThings(ctx, lt - BEAT);
  else wordMove(ctx, lt - BEAT * 2);
}
