// 02 — Énergie. One word per beat; the last one whips into speed lines for F1.
import { W, H, BEAT, S8, E, PAL, prog, lerp, clamp, wobble, shake, layout, hash } from '../util.js';

function fit(ctx, family, size, word, maxW) {
  ctx.font = `${family.replace('{s}', size)}`;
  const w = ctx.measureText(word).width;
  if (w > maxW) { size = Math.floor((size * maxW) / w); ctx.font = family.replace('{s}', size); }
  return size;
}
const capCache = {};
function capH(ctx) {
  if (!(ctx.font in capCache)) capCache[ctx.font] = ctx.measureText('H').actualBoundingBoxAscent;
  return capCache[ctx.font];
}

function energie(ctx, l) {
  ctx.fillStyle = PAL.yellow; ctx.fillRect(0, 0, W, H);
  const sh = shake(l, 0, 28, 10, 1);
  ctx.save(); ctx.translate(sh.x, sh.y);
  fit(ctx, '400 {s}px Anton', 500, 'ÉNERGIE', 1700);
  ctx.letterSpacing = '4px';
  const L = layout(ctx, 'ÉNERGIE'), ch = capH(ctx);
  const x0 = (W - L.total) / 2, base = H / 2 + ch / 2;
  for (let k = 0; k < 3; k++) {
    const q = prog(l, S8 + k * 0.04, S8 + k * 0.04 + 0.28);
    if (q <= 0 || q >= 1) continue;
    const s = 1 + 0.4 * E.outCubic(q);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
    ctx.strokeStyle = `rgba(10,19,53,${(1 - q) * 0.8})`; ctx.lineWidth = 3 / s;
    ctx.strokeText('ÉNERGIE', x0, base);
    ctx.restore();
  }
  L.chars.forEach((c, i) => {
    const t0 = i * 0.022, p = prog(l, t0, t0 + 0.17);
    if (p <= 0) return;
    for (let g = 3; g >= 0; g--) {
      const pg = clamp(p - g * 0.06);
      if (pg <= 0) continue;
      const s = lerp(2.8, 1, E.outExpo(pg));
      ctx.globalAlpha = (g === 0 ? 1 : 0.22 * (1 - g / 4)) * clamp(p * 4);
      ctx.save(); ctx.translate(x0 + c.x + c.w / 2, base - ch / 2); ctx.scale(s, s);
      ctx.fillStyle = PAL.navy; ctx.fillText(c.ch, -c.w / 2, ch / 2);
      ctx.restore();
    }
  });
  ctx.restore();
}

function vitesse(ctx, l) {
  ctx.fillStyle = PAL.navy; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.font = '900 150px Unbounded'; ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255,255,255,${0.15 * E.outCubic(prog(l, 0, 0.12))})`;
  const row = 'VITESSE — VITESSE — VITESSE — ';
  const rw = ctx.measureText(row).width;
  for (let r = 0; r < 8; r++) {
    const dir = r % 2 ? 1 : -1;
    let x = (dir * (l * 2600 + 500 * E.outExpo(prog(l, 0, 0.25))) + r * 313) % rw;
    if (x > 0) x -= rw;
    ctx.strokeText(row, x, 30 + r * 160); ctx.strokeText(row, x + rw, 30 + r * 160);
  }
  ctx.restore();
  const sh = shake(l, 0, 16, 12, 2);
  ctx.save(); ctx.translate(sh.x, sh.y);
  fit(ctx, '900 {s}px Unbounded', 250, 'VITESSE', 1700);
  const L = layout(ctx, 'VITESSE'), ch = capH(ctx);
  const x0 = (W - L.total) / 2, base = H / 2 + ch / 2;
  ctx.fillStyle = PAL.red;
  ctx.fillRect(x0, base + 46, L.total * E.outExpo(prog(l, 0.06, 0.32)), 24);
  ctx.fillStyle = PAL.white;
  L.chars.forEach((c, i) => {
    const p = prog(l, i * 0.025, i * 0.025 + 0.24);
    if (p <= 0) return;
    ctx.save();
    ctx.translate(x0 + c.x + c.w / 2, base - ch / 2 + (1 - E.outExpo(p)) * 120);
    ctx.rotate((1 - E.outExpo(p)) * -0.25);
    ctx.scale(1, E.outBack(p, 2.6));
    ctx.fillText(c.ch, -c.w / 2, ch / 2);
    ctx.restore();
  });
  ctx.restore();
}

function altitude(ctx, l) {
  ctx.fillStyle = PAL.red; ctx.fillRect(0, 0, W, H);
  const sh = shake(l, 0.1, 18, 12, 3);
  ctx.save(); ctx.translate(sh.x, sh.y);
  fit(ctx, '400 {s}px Anton', 560, 'ALTITUDE', 1720);
  ctx.letterSpacing = '4px';
  const L = layout(ctx, 'ALTITUDE'), ch = capH(ctx);
  const x0 = (W - L.total) / 2, base = H / 2 + ch / 2;
  ctx.fillStyle = PAL.white;
  L.chars.forEach((c, i) => {
    const tl = i * 0.028, pf = prog(l, tl, tl + 0.1);
    if (pf <= 0) return;
    let yo = -(1 - E.inQuad(pf)) * 900, sy = pf < 1 ? 1.25 : 1, sx = pf < 1 ? 0.86 : 1;
    const k = wobble(l - tl - 0.1, 11, 38);
    sy *= 1 - 0.3 * k; sx *= 1 + 0.22 * k;
    const hp = prog(l, S8 + i * 0.03, S8 + i * 0.03 + 0.14);
    yo -= Math.sin(Math.PI * hp) * 80;
    ctx.save(); ctx.translate(x0 + c.x + c.w / 2, base + yo); ctx.scale(sx, sy);
    ctx.fillText(c.ch, -c.w / 2, 0);
    ctx.restore();
  });
  ctx.restore();
}

function adrenaline(ctx, l) {
  const dark = E.inOutCubic(prog(l, 0.17, 0.36));
  ctx.fillStyle = PAL.silver; ctx.fillRect(0, 0, W, H);
  if (dark > 0) { ctx.fillStyle = `rgba(5,10,30,${dark})`; ctx.fillRect(0, 0, W, H); }
  fit(ctx, '400 {s}px Anton', 440, 'ADRÉNALINE', 1760);
  ctx.letterSpacing = '2px';
  const L = layout(ctx, 'ADRÉNALINE'), ch = capH(ctx);
  const x0 = (W - L.total) / 2, base = H / 2 + ch / 2;
  // speed lines streaking right-to-left
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const y = hash(i * 7.1) * H;
    const sp = 2600 + hash(i * 3.3) * 3000;
    const len = 200 + hash(i * 5.7) * 700;
    const x = W + 200 - ((l * sp + hash(i) * 3000) % (W + 1400));
    ctx.fillStyle = i % 4 === 0 ? `rgba(226,23,61,${0.25 + 0.6 * dark})` : `rgba(255,255,255,${0.12 + 0.6 * dark})`;
    ctx.fillRect(x, y, len, 2 + hash(i * 9.9) * 4);
  }
  ctx.restore();
  L.chars.forEach((c, i) => {
    const p = prog(l, i * 0.014, i * 0.014 + 0.14);
    if (p <= 0) return;
    let dx = (1 - E.outExpo(p)) * 900, sx = lerp(2.6, 1, E.outExpo(p)), a = 1;
    const w = prog(l, 0.17 + i * 0.012, 0.17 + i * 0.012 + 0.18);
    if (w > 0) { dx -= E.inExpo(w) * 2800; sx *= 1 + 3 * E.inCubic(w); a = 1 - E.inQuad(w); }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x0 + c.x + c.w / 2 + dx, base);
    ctx.scale(sx, 1);
    ctx.fillStyle = dark > 0.5 ? PAL.white : PAL.navy;
    ctx.fillText(c.ch, -c.w / 2, 0);
    ctx.restore();
  });
}

export function kinetic(ctx, lt) {
  if (lt < BEAT) energie(ctx, lt);
  else if (lt < 2 * BEAT) vitesse(ctx, lt - BEAT);
  else if (lt < 3 * BEAT) altitude(ctx, lt - 2 * BEAT);
  else adrenaline(ctx, lt - 3 * BEAT);
}
