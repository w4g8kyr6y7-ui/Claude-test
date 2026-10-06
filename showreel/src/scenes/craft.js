// 07 — Craft. A behind-the-scenes graph editor (with this reel's real timeline),
// then a 16th-note glitch montage recapping every style.
import { W, H, BEAT, BAR, DUR, E, PAL, TAU, prog, lerp, spring, scramble, bezierEase, circle, makeCanvas, resetCtx } from '../util.js';
import { glitch } from '../fx.js';

const X0 = 110, Y0 = 118, X1 = 1810, Y1 = 962;
const UI = { bg: '#0B0B0E', win: '#131317', panel: '#0E0E12', line: '#272730', text: '#80808C', hi: '#ECECF2' };
const PV = { x: X0 + 20, y: Y0 + 56, w: 820, h: 440 };
const GE = { x: X0 + 860, y: Y0 + 56, w: 820, h: 440 };
const TL = { x: X0 + 20, y: Y0 + 516, w: 1660, h: Y1 - Y0 - 536 };

const LAYERS = [
  { name: 'dot.red', col: PAL.red, span: [0, DUR], keys: [0.04, 1.1, 1.55, 3.3, 3.75, 13.4] },
  { name: 'type / MOVE.', col: PAL.yellow, span: [BAR, BAR * 2], keys: [1.875, 2.34, 2.81, 3.28] },
  { name: 'grid_tiles', col: PAL.bBlue, span: [BAR * 2, BAR * 3], keys: [3.75, 4.69, 5.16, 5.5] },
  { name: 'neon_sign', col: PAL.magenta, span: [BAR * 3, BAR * 4], keys: [5.63, 6.09, 6.56, 7.03] },
  { name: 'chrome_sdf', col: PAL.lavender, span: [BAR * 4, BAR * 5], keys: [7.5, 8.2, 8.9, 9.3] },
  { name: 'fluid_field', col: '#FF7A1A', span: [BAR * 5, BAR * 6], keys: [9.4, 10.3, 11.1] },
  { name: 'logo_lockup', col: PAL.paper, span: [BAR * 7, DUR], keys: [13.13, 13.6, 14.06] },
];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function cursor(ctx, x, y, down) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(down ? 0.92 : 1, down ? 0.92 : 1);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(14, 36); ctx.lineTo(19, 34); ctx.lineTo(13, 21); ctx.lineTo(23, 21); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
}

function ui(ctx, l) {
  ctx.fillStyle = UI.bg;
  ctx.fillRect(0, 0, W, H);
  const ap = k => E.outExpo(prog(l, k * 0.03, 0.3 + k * 0.03));

  rr(ctx, X0, Y0, X1 - X0, Y1 - Y0, 16);
  ctx.fillStyle = UI.win; ctx.fill();
  ctx.strokeStyle = UI.line; ctx.lineWidth = 1.5; ctx.stroke();
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { ctx.fillStyle = c; circle(ctx, X0 + 26 + i * 22, Y0 + 24, 7); ctx.fill(); });
  ctx.font = '500 16px "JetBrains Mono"'; ctx.fillStyle = UI.text; ctx.textAlign = 'center';
  ctx.fillText('reel_FINAL_v12_final2.comp  —  1920×1080  60fps', (X0 + X1) / 2, Y0 + 30);
  ctx.textAlign = 'left';

  // ---------- preview with onion skin + spacing chart
  const P1 = [lerp(0.25, 0.16, E.inOutCubic(prog(l, 0.12, 0.36))), lerp(0.25, 1.0, E.inOutCubic(prog(l, 0.12, 0.36)))];
  const P2 = [lerp(0.75, 0.3, E.inOutCubic(prog(l, 0.46, 0.66))), lerp(0.75, 1.0, E.inOutCubic(prog(l, 0.46, 0.66)))];
  const ease = x => bezierEase(P1[0], P1[1], P2[0], P2[1], x);
  ctx.save();
  ctx.globalAlpha = ap(1);
  rr(ctx, PV.x, PV.y, PV.w, PV.h, 10); ctx.fillStyle = UI.panel; ctx.fill(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for (let gx = PV.x; gx < PV.x + PV.w; gx += 40) { ctx.beginPath(); ctx.moveTo(gx + 0.5, PV.y); ctx.lineTo(gx + 0.5, PV.y + PV.h); ctx.stroke(); }
  for (let gy = PV.y; gy < PV.y + PV.h; gy += 40) { ctx.beginPath(); ctx.moveTo(PV.x, gy + 0.5); ctx.lineTo(PV.x + PV.w, gy + 0.5); ctx.stroke(); }
  ctx.font = '500 14px "JetBrains Mono"'; ctx.fillStyle = UI.text; ctx.letterSpacing = '2px';
  ctx.fillText('PREVIEW', PV.x + 20, PV.y + 32);
  const ax = PV.x + 100, bx = PV.x + PV.w - 100, by = PV.y + 220;
  ctx.strokeStyle = UI.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ax, by + 80); ctx.lineTo(bx, by + 80); ctx.stroke();
  ctx.fillStyle = UI.hi;
  for (let k = 0; k <= 12; k++) {
    const x = lerp(ax, bx, ease(k / 12));
    ctx.fillRect(x - 1, by + 68, 2, k % 6 === 0 ? 26 : 16);
  }
  ctx.fillStyle = UI.text;
  ctx.fillText('SPACING', PV.x + 20, by + 130);
  const tau = (l * 1.6) % 1;
  for (let k = 8; k >= 0; k--) {
    const tk = tau - k * 0.04;
    if (tk < 0) continue;
    ctx.fillStyle = k === 0 ? PAL.red : `rgba(255,61,31,${0.16 * (1 - k / 9)})`;
    circle(ctx, lerp(ax, bx, ease(tk)), by, 36); ctx.fill();
  }
  ctx.restore();

  // ---------- graph editor
  ctx.save();
  ctx.globalAlpha = ap(2);
  rr(ctx, GE.x, GE.y, GE.w, GE.h, 10); ctx.fillStyle = UI.panel; ctx.fill();
  ctx.font = '500 14px "JetBrains Mono"'; ctx.fillStyle = UI.text; ctx.letterSpacing = '2px';
  ctx.fillText('GRAPH EDITOR — VALUE', GE.x + 20, GE.y + 32);
  const px = GE.x + 80, py = GE.y + 80, pw = GE.w - 160, ph = GE.h - 150;
  const M = (u, v) => [px + u * pw, py + ph - v * ph];
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    ctx.beginPath(); ctx.moveTo(px, py + (ph * k) / 4 + 0.5); ctx.lineTo(px + pw, py + (ph * k) / 4 + 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + (pw * k) / 4 + 0.5, py); ctx.lineTo(px + (pw * k) / 4 + 0.5, py + ph); ctx.stroke();
  }
  const [a0, a1] = M(0, 0), [b0, b1] = M(1, 1), [c0, c1] = M(...P1), [d0, d1] = M(...P2);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(c0, c1); ctx.moveTo(b0, b1); ctx.lineTo(d0, d1); ctx.stroke();
  ctx.strokeStyle = PAL.red; ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(255,61,31,0.6)'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(a0, a1); ctx.bezierCurveTo(c0, c1, d0, d1, b0, b1); ctx.stroke();
  ctx.shadowBlur = 0;
  [[a0, a1], [b0, b1]].forEach(([x, y]) => { ctx.fillStyle = UI.hi; ctx.fillRect(x - 6, y - 6, 12, 12); });
  const drag1 = l > 0.12 && l < 0.36, drag2 = l > 0.46 && l < 0.66;
  [[c0, c1, drag1], [d0, d1, drag2]].forEach(([x, y, on]) => {
    ctx.fillStyle = on ? PAL.yellow : UI.win; ctx.strokeStyle = UI.hi; ctx.lineWidth = 2;
    circle(ctx, x, y, on ? 10 : 8); ctx.fill(); ctx.stroke();
  });
  ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '0px'; ctx.fillStyle = UI.hi;
  ctx.fillText(`cubic-bezier(${P1[0].toFixed(2)}, ${P1[1].toFixed(2)}, ${P2[0].toFixed(2)}, ${P2[1].toFixed(2)})`, GE.x + 20, GE.y + GE.h - 24);
  // cursor choreography
  let cx, cy;
  const home = [GE.x + GE.w - 120, GE.y + GE.h - 90];
  if (l < 0.12) { const e = E.inOutCubic(prog(l, 0, 0.12)); cx = lerp(home[0], M(0.25, 0.25)[0], e); cy = lerp(home[1], M(0.25, 0.25)[1], e); }
  else if (l < 0.46) { const e = E.inOutCubic(prog(l, 0.36, 0.46)); cx = lerp(c0, M(0.75, 0.75)[0], e); cy = lerp(c1, M(0.75, 0.75)[1], e); }
  else { cx = d0; cy = d1; if (l > 0.7) { const e = E.inOutCubic(prog(l, 0.7, 0.9)); cx = lerp(d0, home[0], e); cy = lerp(d1, home[1], e); } }
  cursor(ctx, cx + 2, cy + 2, drag1 || drag2);
  ctx.restore();

  // ---------- timeline (this reel's actual structure)
  ctx.save();
  ctx.globalAlpha = ap(3);
  rr(ctx, TL.x, TL.y, TL.w, TL.h, 10); ctx.fillStyle = UI.panel; ctx.fill();
  const nameW = 250, tx = TL.x + nameW, tw = TL.w - nameW - 30, ty = TL.y + 44, rh = 30;
  const X = s => tx + (s / DUR) * tw;
  ctx.font = '500 13px "JetBrains Mono"'; ctx.fillStyle = UI.text; ctx.letterSpacing = '1px';
  for (let s = 0; s <= DUR; s += 0.5) {
    const x = X(s);
    ctx.fillRect(x, TL.y + 14, 1, s % 1 === 0 ? 12 : 6);
    if (s % 3 === 0) ctx.fillText(`00:${String(s).padStart(2, '0')}`, x + 4, TL.y + 24);
  }
  const head = DUR * E.inOutQuad(prog(l, 0.04, BEAT * 2 - 0.02));
  LAYERS.forEach((L, i) => {
    const y = ty + i * rh;
    const rp = ap(4 + i * 0.5);
    ctx.globalAlpha = rp;
    ctx.fillStyle = L.col; ctx.fillRect(TL.x + 20, y + 8, 12, 12);
    ctx.fillStyle = UI.hi; ctx.font = '500 15px "JetBrains Mono"';
    ctx.fillText(L.name, TL.x + 44, y + 19);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(tx, y + 3, tw, rh - 6);
    ctx.globalAlpha = rp * 0.55;
    ctx.fillStyle = L.col;
    const sx0 = X(L.span[0]), sx1 = lerp(sx0, X(L.span[1]), E.outExpo(prog(l, 0.05 + i * 0.03, 0.45 + i * 0.03)));
    ctx.fillRect(sx0, y + 6, sx1 - sx0, rh - 12);
    ctx.globalAlpha = rp;
    L.keys.forEach(k => {
      const x = X(k), hit = head >= k;
      const pop = hit ? 1 + 0.9 * Math.max(0, 1 - (head - k) * 4) : 1;
      ctx.save();
      ctx.translate(x, y + rh / 2); ctx.rotate(Math.PI / 4); ctx.scale(pop, pop);
      ctx.fillStyle = hit ? UI.hi : '#55555F';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    });
  });
  ctx.globalAlpha = 1;
  const hx = X(head);
  ctx.fillStyle = PAL.red;
  ctx.fillRect(hx - 1, TL.y + 8, 2, TL.h - 16);
  ctx.beginPath(); ctx.moveTo(hx - 8, TL.y + 8); ctx.lineTo(hx + 8, TL.y + 8); ctx.lineTo(hx, TL.y + 20); ctx.fill();
  ctx.restore();

  // sticker slap
  const sp = prog(l, BEAT, BEAT + 0.24);
  if (sp > 0) {
    const s = 1 + 0.9 * (1 - E.outBack(sp, 2.2));
    ctx.save();
    ctx.translate(W / 2 + 30, H / 2 + 20);
    ctx.rotate(-0.07 + (1 - E.outExpo(sp)) * 0.2);
    ctx.scale(s, s);
    ctx.font = '900 74px "Inter Display SR"'; ctx.letterSpacing = '-2px';
    const tw2 = ctx.measureText('EVERY FRAME, ON PURPOSE.').width;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    rr(ctx, -tw2 / 2 - 40 + 12, -70 + 14, tw2 + 80, 132, 14); ctx.fill();
    ctx.fillStyle = PAL.red;
    rr(ctx, -tw2 / 2 - 40, -70, tw2 + 80, 132, 14); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('EVERY FRAME, ON PURPOSE.', -tw2 / 2, 26);
    ctx.restore();
  }
}

const CUTS = [[2.0, 'TYPE'], [4.25, 'SHAPE'], [6.95, 'LIGHT'], [8.3, '3D'], [10.4, 'FLUID'], [1.3, 'GRID'], [3.05, 'TIMING'], [11.6, 'CRAFT']];
let snap = null, renderAt = null;
export const setRenderer = f => { renderAt = f; };

function montage(ctx, l, t) {
  if (!snap) snap = makeCanvas();
  const step = BEAT / 4;
  const k = Math.min(7, Math.floor(l / step));
  const lk = l - k * step;
  const [T, word] = CUTS[k];
  resetCtx(snap.x);
  renderAt(snap.x, T + lk * 0.8);
  const z = 1.16 - 0.16 * E.outExpo(prog(lk, 0, step));
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.rotate((k % 2 ? 1 : -1) * 0.012); ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(snap.c, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.font = '900 190px Unbounded';
  ctx.letterSpacing = '-4px';
  const ww = ctx.measureText(word).width;
  const bx = W / 2 - ww / 2 - 40, byy = H / 2 - 125;
  ctx.fillStyle = k % 2 ? PAL.red : PAL.ink;
  ctx.fillRect(bx, byy, ww + 80 + 4, 250);
  ctx.fillStyle = '#fff';
  ctx.fillText(word, W / 2 - ww / 2, H / 2 + 70);
  ctx.font = '700 24px "JetBrains Mono"'; ctx.letterSpacing = '3px';
  ctx.fillText(`${String(k + 1).padStart(2, '0')}/08`, bx, byy - 18);
  ctx.restore();

  glitch(ctx, 0.2 + 0.5 * (k / 7) + (lk < 0.035 ? 0.35 : 0), k * 17 + Math.floor(t * 60));

  const wf = E.inQuad(prog(l, BEAT * 2 - 0.09, BEAT * 2));
  if (wf > 0) { ctx.fillStyle = `rgba(255,255,255,${wf})`; ctx.fillRect(0, 0, W, H); }
}

export function craft(ctx, lt, t) {
  if (lt < BEAT * 2) {
    ui(ctx, lt);
    if (lt < 0.12) glitch(ctx, (1 - lt / 0.12) * 0.85, Math.floor(t * 60));
  } else {
    montage(ctx, lt - BEAT * 2, t);
  }
}
