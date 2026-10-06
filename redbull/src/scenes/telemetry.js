// 09 — Télémétrie. A live data dashboard for the five sports and an energy
// gauge, a sticker slap, then a 16th-note glitch montage recapping the film.
import { W, H, BEAT, S16, E, PAL, TAU, prog, lerp, spring, scramble, circle, makeCanvas, resetCtx } from '../util.js';
import { glitch } from '../fx.js';

const X0 = 110, Y0 = 118, X1 = 1810, Y1 = 962;
const PW = 540, PH = 372;
const fr = (v, d = 1) => v.toFixed(d).replace('.', ',');
const thousands = v => `${Math.floor(v / 1000)} ${String(Math.floor(v % 1000)).padStart(3, '0')}`;

const PANELS = [
  { t: 'F1 · VITESSE', col: '#FF2E52', f: x => (1 - Math.exp(-3.2 * x)) * (0.86 + 0.14 * ((x * 5) % 1)), v: p => String(Math.round(342 * p)), u: 'KM/H' },
  { t: 'WINGSUIT · ALTITUDE', col: '#5B8CFF', f: x => 1 - 0.8 * x ** 1.2, v: p => thousands(4000 - 2800 * p), u: 'M' },
  { t: 'FMX · TEMPS DE VOL', col: PAL.yellow, f: x => Math.abs(Math.sin(x * Math.PI * 3)) * 0.9, v: p => fr(2.1 * p), u: 'S' },
  { t: 'SNOW · FORCE G', col: '#9FD3FF', f: x => 0.5 + 0.38 * Math.sin(x * 20) * (0.5 + 0.5 * Math.sin(x * 4)), v: p => fr(3.8 * p), u: 'G' },
  { t: 'SURF · HAUTEUR DE VAGUE', col: '#19D3E6', f: x => 0.45 + 0.3 * Math.sin(x * 10) + 0.12 * Math.sin(x * 27), v: p => String(Math.round(8 * p)), u: 'M' },
  { t: 'ÉNERGIE', gauge: true },
];

function panel(ctx, k, l) {
  const P = PANELS[k];
  const x = 130 + (k % 3) * (PW + 20), y = 176 + Math.floor(k / 3) * (PH + 20);
  const ap = E.outExpo(prog(l, k * 0.035, 0.3 + k * 0.035));
  const p = E.outCubic(prog(l, 0.05 + k * 0.035, 0.62 + k * 0.035));
  ctx.save();
  ctx.globalAlpha = ap;
  ctx.translate(0, (1 - ap) * 40);
  ctx.fillStyle = '#0D1330';
  ctx.beginPath(); ctx.roundRect(x, y, PW, PH, 12); ctx.fill();
  ctx.strokeStyle = '#1F2A55'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = '500 15px "JetBrains Mono"'; ctx.letterSpacing = '2px'; ctx.fillStyle = '#8C96B8';
  ctx.fillText(scramble(P.t, prog(l, k * 0.035, 0.25 + k * 0.035), l, k), x + 24, y + 38);
  if (P.gauge) {
    const cx = x + PW / 2, cy = y + PH / 2 + 24, r = 118;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
    ctx.strokeStyle = PAL.yellow; ctx.shadowColor = 'rgba(255,194,14,0.7)'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * p)); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PAL.yellow;
    circle(ctx, cx, cy, 52 * spring(l - 0.3, 3, 0.4)); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 40px Unbounded'; ctx.textAlign = 'center'; ctx.letterSpacing = '0px';
    ctx.fillText(`${Math.round(100 * p)} %`, cx, cy + r + 16);
  } else {
    ctx.fillStyle = '#fff'; ctx.font = '900 62px Unbounded'; ctx.letterSpacing = '0px';
    const val = P.v(p);
    ctx.fillText(val, x + 24, y + 116);
    const vw = ctx.measureText(val).width;
    ctx.font = '500 20px "JetBrains Mono"'; ctx.fillStyle = '#8C96B8';
    ctx.fillText(P.u, x + 34 + vw, y + 116);
    const gx = x + 24, gy = y + 160, gw = PW - 48, gh = PH - 190;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(gx, gy + (gh * i) / 4 + 0.5); ctx.lineTo(gx + gw, gy + (gh * i) / 4 + 0.5); ctx.stroke(); }
    ctx.strokeStyle = P.col; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.shadowColor = P.col; ctx.shadowBlur = 14;
    ctx.beginPath();
    const n = 120;
    let lx = gx, ly = gy + gh;
    for (let i = 0; i <= n * p; i++) {
      const u = i / n;
      lx = gx + u * gw; ly = gy + gh - P.f(u) * gh;
      i ? ctx.lineTo(lx, ly) : ctx.moveTo(lx, ly);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    if (p > 0) { circle(ctx, lx, ly, 7); ctx.fill(); }
  }
  ctx.restore();
}

function dashboard(ctx, l) {
  ctx.fillStyle = '#050A1E';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0A1029';
  ctx.beginPath(); ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 16); ctx.fill();
  ctx.strokeStyle = '#1F2A55'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = '500 16px "JetBrains Mono"'; ctx.fillStyle = '#8C96B8'; ctx.textAlign = 'center'; ctx.letterSpacing = '3px';
  ctx.fillText('TÉLÉMÉTRIE — 5 SPORTS · 1 ÉNERGIE — LIVE', (X0 + X1) / 2, Y0 + 34);
  ctx.textAlign = 'left';
  ctx.fillStyle = Math.floor(l * 8) % 2 ? PAL.red : '#5A1020';
  circle(ctx, X0 + 30, Y0 + 28, 7); ctx.fill();
  for (let k = 0; k < 6; k++) panel(ctx, k, l);

  const sp = prog(l, BEAT, BEAT + 0.2);
  if (sp > 0) {
    const s = 1 + 0.9 * (1 - E.outBack(sp, 2.2));
    ctx.save();
    ctx.translate(W / 2 + 20, H / 2 + 10);
    ctx.rotate(-0.08 + (1 - E.outExpo(sp)) * 0.25);
    ctx.scale(s, s);
    ctx.font = '900 96px "Inter Display SR"'; ctx.letterSpacing = '-2px';
    const tw = ctx.measureText('ZÉRO LIMITE.').width;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(-tw / 2 - 44 + 12, -84 + 14, tw + 88, 160, 16); ctx.fill();
    ctx.fillStyle = PAL.red;
    ctx.beginPath(); ctx.roundRect(-tw / 2 - 44, -84, tw + 88, 160, 16); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('ZÉRO LIMITE.', -tw / 2, 32);
    ctx.restore();
  }
}

const CUTS = [[1.62, 'ÉNERGIE'], [3.9, 'F1'], [5.3, 'WINGSUIT'], [6.45, 'FMX'], [8.3, 'SNOW'], [9.8, 'FRAÎCHEUR'], [11.0, 'CLIFF'], [2.7, 'ADRÉNALINE']];
let snap = null, renderAt = null;
export const setRenderer = f => { renderAt = f; };

function montage(ctx, l, t) {
  if (!snap) snap = makeCanvas();
  const k = Math.min(7, Math.floor(l / S16));
  const lk = l - k * S16;
  const [T, word] = CUTS[k];
  resetCtx(snap.x);
  renderAt(snap.x, T + lk * 0.8);
  const z = 1.16 - 0.16 * E.outExpo(prog(lk, 0, S16));
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.rotate((k % 2 ? 1 : -1) * 0.015); ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(snap.c, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.font = '900 170px Unbounded'; ctx.letterSpacing = '-4px';
  let ww = ctx.measureText(word).width;
  const sc = Math.min(1, 1500 / ww);
  ctx.translate(W / 2, H / 2); ctx.scale(sc, sc);
  ctx.fillStyle = [PAL.red, PAL.navy, PAL.yellow][k % 3];
  ctx.fillRect(-ww / 2 - 40, -125, ww + 84, 230);
  ctx.fillStyle = k % 3 === 2 ? PAL.navy : '#fff';
  ctx.fillText(word, -ww / 2, 60);
  ctx.font = '700 24px "JetBrains Mono"'; ctx.letterSpacing = '3px'; ctx.fillStyle = '#fff';
  ctx.fillText(`${String(k + 1).padStart(2, '0')}/08`, -ww / 2 - 40, -145);
  ctx.restore();
  glitch(ctx, 0.2 + 0.5 * (k / 7) + (lk < 0.03 ? 0.35 : 0), k * 17 + Math.floor(t * 60));
  const wf = E.inQuad(prog(l, 2 * BEAT - 0.08, 2 * BEAT));
  if (wf > 0) { ctx.fillStyle = `rgba(255,255,255,${wf})`; ctx.fillRect(0, 0, W, H); }
}

export function telemetry(ctx, lt, t) {
  if (lt < 2 * BEAT) {
    dashboard(ctx, lt);
    if (lt < 0.1) glitch(ctx, (1 - lt / 0.1) * 0.85, Math.floor(t * 60));
  } else {
    montage(ctx, lt - 2 * BEAT, t);
  }
}
