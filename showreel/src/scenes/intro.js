// 01 — Swiss grid intro. A red dot becomes the period of "Motion design."
// and then swallows the frame to open the next scene.
import { W, H, BEAT, E, PAL, TAU, prog, spring, lerp, wobble, layout, scramble, badge, circle } from '../util.js';

const M = 96, COLS = 12, COLW = (W - 2 * M) / COLS;
const MOTION_Y = 560, DESIGN_Y = 868;
const F_MOTION = '900 300px "Inter Display SR"', F_DESIGN = 'italic 400 370px "Instrument Serif"';
const F_MONO = '400 21px "JetBrains Mono"';

let L = null;
function getLayout(ctx) {
  if (L) return L;
  ctx.save();
  ctx.font = F_MOTION; ctx.letterSpacing = '-14px';
  const motion = layout(ctx, 'Motion');
  ctx.font = F_DESIGN; ctx.letterSpacing = '-6px';
  const design = layout(ctx, 'design');
  ctx.restore();
  const dx = M + COLW * 3 - 10;
  const r = 30;
  L = { motion, design, dx, dot: { x: dx + design.total + 30, y: DESIGN_Y - r - 2, r } };
  return L;
}

function dotPos(lt, D) {
  const cx = W / 2 + 330, cy = 330;
  const p = prog(lt, 0.52, 1.1);
  const e = E.inOutCubic(p);
  return { x: lerp(cx, D.x, e), y: lerp(cy, D.y, e) - Math.sin(Math.PI * e) * 260 };
}

function word(ctx, w, x0, base, size, font, ls, t0, lt, stagger) {
  ctx.save();
  ctx.font = font; ctx.letterSpacing = ls; ctx.fillStyle = PAL.ink;
  ctx.beginPath(); ctx.rect(0, base - size * 0.95, W, size * 1.3); ctx.clip();
  w.chars.forEach((c, i) => {
    const p = prog(lt, t0 + i * stagger, t0 + i * stagger + 0.55);
    if (p <= 0) return;
    const dy = (1 - E.outExpo(p)) * size * 1.15;
    ctx.fillText(c.ch, x0 + c.x, base + dy);
  });
  ctx.restore();
}

export function intro(ctx, lt) {
  const Lo = getLayout(ctx);
  ctx.fillStyle = PAL.paper;
  ctx.fillRect(0, 0, W, H);

  // Grid: columns drop in, guides slide across.
  ctx.save();
  ctx.strokeStyle = 'rgba(13,13,15,0.14)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= COLS; i++) {
    const p = E.outExpo(prog(lt, 0.015 * i, 0.015 * i + 0.7));
    if (p <= 0) continue;
    const x = Math.round(M + i * COLW) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x, 120 + (H - 240) * p); ctx.stroke();
  }
  [180, MOTION_Y, DESIGN_Y, H - 150].forEach((y, k) => {
    const p = E.outExpo(prog(lt, 0.08 + k * 0.05, 0.08 + k * 0.05 + 0.7));
    if (p <= 0) return;
    ctx.beginPath(); ctx.moveTo(M - 30, y + 0.5); ctx.lineTo(M - 30 + (W - 2 * M + 60) * p, y + 0.5); ctx.stroke();
  });
  // registration marks
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.5;
  [[M, 180], [W - M, 180], [M, H - 150], [W - M, H - 150]].forEach(([x, y], k) => {
    const s = spring(lt - 0.2 - k * 0.04, 4, 0.4) * 12;
    if (s <= 0) return;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
  });
  ctx.restore();

  // Type
  word(ctx, Lo.motion, M - 10, MOTION_Y, 300, F_MOTION, '-14px', BEAT, lt, 0.035);
  word(ctx, Lo.design, Lo.dx, DESIGN_Y, 370, F_DESIGN, '-6px', BEAT * 2, lt, 0.03);

  // Mono details
  ctx.save();
  ctx.font = F_MONO; ctx.fillStyle = PAL.ink; ctx.letterSpacing = '1px';
  const lines = [['(01)', M, 236], ['SELECTED WORK 2026', M + COLW * 2, 236], ['2D / 3D / TYPE', M + COLW * 6, 236], ['LIGHT / FLUID / SOUND', M + COLW * 6, 266]];
  lines.forEach(([s, x, y], i) => ctx.fillText(scramble(s, prog(lt, 0.25 + i * 0.07, 0.6 + i * 0.07), lt, i), x, y));
  ctx.fillText(scramble('MOTION DESIGNER — PORTFOLIO', prog(lt, 1.15, 1.45), lt, 9), M + COLW * 6, H - 112);
  ctx.fillText(scramble('↓ PLAY', prog(lt, 1.2, 1.4), lt, 4), M, H - 112);
  ctx.restore();

  // Rotating badge
  const bs = spring(lt - 1.0, 3, 0.35);
  if (bs > 0) {
    ctx.save();
    ctx.translate(W - M - 150, 420);
    ctx.scale(bs, bs);
    ctx.fillStyle = PAL.ink; circle(ctx, 0, 0, 132); ctx.fill();
    badge(ctx, 0, 0, 104, 'AVAILABLE FOR WORK • MOTION • DESIGN • ', lt * 1.4, '700 19px "JetBrains Mono"', PAL.paper);
    ctx.strokeStyle = PAL.paper; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.rotate(lt * 2);
    ctx.beginPath(); ctx.moveTo(-26, -26); ctx.lineTo(26, 26); ctx.moveTo(26, -4); ctx.lineTo(26, 26); ctx.lineTo(4, 26); ctx.stroke();
    ctx.restore();
  }

  // The red dot
  const D = Lo.dot;
  const pos = dotPos(lt, D);
  const pop = spring(lt - 0.04, 3.2, 0.32);
  let rr = D.r * pop;
  // ripple on spawn
  const q = prog(lt, 0.06, 0.75);
  if (q > 0 && q < 1) {
    ctx.strokeStyle = `rgba(13,13,15,${(1 - q) * 0.8})`; ctx.lineWidth = 1.5;
    circle(ctx, W / 2 + 330, 330, D.r + 260 * E.outCubic(q)); ctx.stroke();
    circle(ctx, W / 2 + 330, 330, D.r + 150 * E.outCubic(prog(lt, 0.12, 0.75))); ctx.stroke();
  }
  // velocity-aligned stretch while travelling, squash on landing
  const p2 = dotPos(lt + 0.004, D);
  const vx = p2.x - pos.x, vy = p2.y - pos.y, sp = Math.hypot(vx, vy);
  const stretch = Math.min(0.6, sp * 0.04);
  const land = wobble(lt - 1.1, 11, 32);
  const antic = E.inOutQuad(prog(lt, BEAT * 3, BEAT * 3 + 0.14));
  const grow = E.inExpo(prog(lt, BEAT * 3 + 0.14, BEAT * 4));
  const Rmax = Math.hypot(Math.max(pos.x, W - pos.x), Math.max(pos.y, H - pos.y)) + 20;
  rr = rr * (1 - 0.3 * antic);
  if (grow > 0) rr = lerp(rr, Rmax, grow);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  if (sp > 0.01) ctx.rotate(Math.atan2(vy, vx));
  ctx.scale((1 + stretch) * (1 + 0.32 * land), (1 - stretch * 0.5) * (1 - 0.32 * land));
  ctx.fillStyle = PAL.red;
  circle(ctx, 0, 0, rr); ctx.fill();
  ctx.restore();
}
