// 01 — Départ. Swiss grid + F1 start gantry: five lights on the eighth notes,
// lights out, and the sun swallows the frame for the drop.
import { W, H, BEAT, BAR, S8, E, PAL, prog, spring, lerp, layout, scramble, circle } from '../util.js';

const M = 96, COLS = 12, COLW = (W - 2 * M) / COLS;
const LIGHT_ON = [1, 2, 3, 4, 5].map(k => k * S8);
export const LIGHTS_OUT = BEAT * 3.5;
const GX = W / 2, GY = 140, HW = 138, GAP = 34;

function lamp(ctx, x, y, on, pop) {
  ctx.fillStyle = '#0E1328';
  circle(ctx, x, y, 52); ctx.fill();
  ctx.strokeStyle = '#2A3358'; ctx.lineWidth = 3; ctx.stroke();
  if (!on) return;
  const r = 48 * (0.9 + 0.1 * pop);
  const g = ctx.createRadialGradient(x - 10, y - 12, 2, x, y, r);
  g.addColorStop(0, '#FFD0D6'); g.addColorStop(0.25, '#FF3B57'); g.addColorStop(1, '#A10A26');
  ctx.fillStyle = g;
  circle(ctx, x, y, r); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(x, y, 20, x, y, 190);
  gl.addColorStop(0, 'rgba(255,40,70,0.55)'); gl.addColorStop(1, 'rgba(255,40,70,0)');
  ctx.fillStyle = gl;
  circle(ctx, x, y, 190); ctx.fill();
  ctx.restore();
}

export function start(ctx, lt) {
  ctx.fillStyle = PAL.night;
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  for (let i = 0; i <= COLS; i++) {
    const p = E.outExpo(prog(lt, 0.012 * i, 0.012 * i + 0.6));
    if (p <= 0) continue;
    const x = Math.round(M + i * COLW) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x, 110 + (H - 220) * p); ctx.stroke();
  }
  [GY - 40, 700, 880].forEach((y, k) => {
    const p = E.outExpo(prog(lt, 0.06 + k * 0.05, 0.66 + k * 0.05));
    if (p > 0) { ctx.beginPath(); ctx.moveTo(M - 30, y + 0.5); ctx.lineTo(M - 30 + (W - 2 * M + 60) * p, y + 0.5); ctx.stroke(); }
  });
  ctx.restore();

  // gantry
  const out = lt >= LIGHTS_OUT;
  const gs = E.outExpo(prog(lt, 0, 0.35));
  ctx.save();
  ctx.translate(0, (1 - gs) * -400);
  const x0 = GX - (5 * HW + 4 * GAP) / 2;
  ctx.fillStyle = '#141B36';
  ctx.fillRect(x0 - 40, GY - 26, 5 * HW + 4 * GAP + 80, 26);
  for (let k = 0; k < 5; k++) {
    const x = x0 + k * (HW + GAP);
    ctx.fillStyle = '#060A1A';
    ctx.beginPath(); ctx.roundRect(x, GY, HW, 332, 20); ctx.fill();
    ctx.strokeStyle = '#232B4D'; ctx.lineWidth = 2; ctx.stroke();
    const on = !out && lt >= LIGHT_ON[k];
    const pop = 1 - spring(lt - LIGHT_ON[k], 5, 0.3);
    lamp(ctx, x + HW / 2, GY + 92, on, pop);
    lamp(ctx, x + HW / 2, GY + 240, on, pop);
  }
  ctx.restore();

  // type
  ctx.save();
  ctx.font = '900 250px "Inter Display SR"'; ctx.letterSpacing = '-12px'; ctx.fillStyle = PAL.white;
  const L = layout(ctx, 'Prêt ?');
  ctx.beginPath(); ctx.rect(0, 880 - 250, W, 300); ctx.clip();
  L.chars.forEach((c, i) => {
    const p = E.outExpo(prog(lt, 0.1 + i * 0.03, 0.6 + i * 0.03));
    if (p > 0) ctx.fillText(c.ch, M - 8 + c.x, 880 + (1 - p) * 280);
  });
  ctx.restore();

  ctx.save();
  ctx.font = '400 21px "JetBrains Mono"'; ctx.fillStyle = PAL.white; ctx.letterSpacing = '1px';
  const lines = [['(01) SAISON ’26', M + COLW * 8, 760], ['F1 · WINGSUIT · FMX', M + COLW * 8, 792], ['SNOW · SURF · CLIFF', M + COLW * 8, 824]];
  lines.forEach(([s, x, y], i) => ctx.fillText(scramble(s, prog(lt, 0.2 + i * 0.08, 0.55 + i * 0.08), lt, i), x, y));
  const lit = out ? 0 : LIGHT_ON.filter(t => lt >= t).length;
  ctx.fillStyle = lit ? PAL.red : PAL.silver2;
  ctx.fillText(out ? 'FEUX ÉTEINTS — GO' : `FEUX ${lit}/5`, M + COLW * 8, 856 + 30);
  ctx.restore();

  // the sun: born at lights out, swallows the frame on the downbeat
  if (out) {
    const cx = GX, cy = GY + 166;
    const pop = spring(lt - LIGHTS_OUT, 4, 0.4);
    const grow = E.inExpo(prog(lt, LIGHTS_OUT + 0.05, BAR));
    const Rmax = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 20;
    ctx.fillStyle = PAL.yellow;
    circle(ctx, cx, cy, lerp(70 * pop, Rmax, grow)); ctx.fill();
  }
}
