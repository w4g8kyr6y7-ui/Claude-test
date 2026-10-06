// 10 — Donne des ailes. Colour-stack wipe, the sun returns and grows wings,
// wordmark + French tagline, and the spec disclaimer.
import { W, H, BEAT, E, PAL, TAU, prog, lerp, spring, wobble, layout, scramble, circle } from '../util.js';

const STACK = [PAL.yellow, PAL.red, PAL.blue2, PAL.navy, PAL.silver, '#F5F6F9'];
const SUN = { x: W / 2, y: 390, r: 118 };
let L = null;

// A wing built from overlapping leaf-shaped feathers fanning out of the sun.
function wing(ctx, side, open, flap) {
  ctx.save();
  ctx.translate(SUN.x + side * (SUN.r - 18), SUN.y + 4);
  ctx.scale(side, 1);
  for (let k = 4; k >= 0; k--) {
    const o = Math.max(0, open[k]);
    if (o <= 0.001) continue;
    const a = lerp(0.2, -0.98 + k * 0.25, Math.min(1.15, o)) - flap * (0.22 - k * 0.035);
    const len = (380 - k * 52) * o, w = 74 - k * 6;
    const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    const oy = k * 16;
    ctx.fillStyle = k % 2 ? '#15245E' : PAL.navy;
    ctx.beginPath();
    ctx.moveTo(nx * w * 0.35, oy + ny * w * 0.35);
    ctx.quadraticCurveTo(dx * len * 0.55 + nx * w * 0.95, oy + dy * len * 0.55 + ny * w * 0.95, dx * len, oy + dy * len);
    ctx.quadraticCurveTo(dx * len * 0.5 - nx * w * 0.55, oy + dy * len * 0.5 - ny * w * 0.55, -nx * w * 0.35, oy - ny * w * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(213,217,225,0.35)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(dx * 30, oy + dy * 30);
    ctx.quadraticCurveTo(dx * len * 0.55 + nx * w * 0.25, oy + dy * len * 0.55 + ny * w * 0.25, dx * len * 0.92, oy + dy * len * 0.92);
    ctx.stroke();
  }
  // coverts: a rounded mass hiding the feather roots
  const c = Math.max(0, Math.min(1, open[0]));
  if (c > 0) {
    ctx.fillStyle = PAL.navy;
    ctx.beginPath(); ctx.ellipse(60 * c, 10, 120 * c, 62 * c, -0.35, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function outro(ctx, lt) {
  ctx.fillStyle = STACK[0];
  ctx.fillRect(0, 0, W, H);
  for (let k = 1; k < STACK.length; k++) {
    const p = E.outExpo(prog(lt, k * 0.026, k * 0.026 + 0.45));
    if (p <= 0) continue;
    const x = -400 + (W + 800) * p;
    if (k === STACK.length - 1) {
      const bg = ctx.createRadialGradient(W / 2, H / 2 - 60, 100, W / 2, H / 2, 1100);
      bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, '#D9DEE7');
      ctx.fillStyle = bg;
    } else ctx.fillStyle = STACK[k];
    ctx.beginPath();
    ctx.moveTo(-10, -10); ctx.lineTo(x + 220, -10); ctx.lineTo(x - 220, H + 10); ctx.lineTo(-10, H + 10);
    ctx.fill();
  }
  // faint halftone diamonds (can pattern)
  const dp = E.outCubic(prog(lt, 0.3, 0.8));
  if (dp > 0) {
    ctx.fillStyle = `rgba(29,63,150,${0.06 * dp})`;
    for (let y = 0; y < H + 60; y += 60) for (let x = 0; x < W + 60; x += 60) {
      const r = 10 * (1 - Math.abs(y - H / 2) / (H * 0.7));
      if (r <= 0) continue;
      const ox = (y / 60) % 2 ? 30 : 0;
      ctx.beginPath(); ctx.moveTo(x + ox, y - r); ctx.lineTo(x + ox + r, y); ctx.lineTo(x + ox, y + r); ctx.lineTo(x + ox - r, y); ctx.fill();
    }
  }

  const open = [0, 1, 2, 3, 4].map(k => spring(lt - BEAT - k * 0.035, 2.0, 0.42));
  const flap = wobble(lt - BEAT * 3, 7, 18);
  wing(ctx, 1, open, flap);
  wing(ctx, -1, open, flap);
  const sp = spring(lt - 0.16, 3.2, 0.38);
  if (sp > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(SUN.x, SUN.y, SUN.r * 0.6, SUN.x, SUN.y, SUN.r * 2.2);
    g.addColorStop(0, 'rgba(255,194,14,0.35)'); g.addColorStop(1, 'rgba(255,194,14,0)');
    ctx.fillStyle = g; circle(ctx, SUN.x, SUN.y, SUN.r * 2.2 * sp); ctx.fill();
    ctx.fillStyle = PAL.yellow; circle(ctx, SUN.x, SUN.y, SUN.r * sp); ctx.fill();
    ctx.restore();
  }

  if (!L) { ctx.save(); ctx.font = '400 180px "Archivo Black"'; ctx.letterSpacing = '-2px'; L = layout(ctx, 'Red Bull'); ctx.restore(); }
  ctx.save();
  ctx.font = '400 180px "Archivo Black"'; ctx.letterSpacing = '-2px'; ctx.fillStyle = PAL.red;
  const x0 = (W - L.total) / 2, base = 735;
  ctx.beginPath(); ctx.rect(0, base - 190, W, 240); ctx.clip();
  L.chars.forEach((c, i) => {
    const p = E.outExpo(prog(lt, BEAT * 1.5 + i * 0.03, BEAT * 1.5 + i * 0.03 + 0.45));
    if (p > 0) ctx.fillText(c.ch, x0 + c.x, base + (1 - p) * 220);
  });
  ctx.restore();

  const rv = E.outExpo(prog(lt, BEAT * 2, BEAT * 2 + 0.45));
  if (rv > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(W / 2 - (W / 2) * rv, 760, W * rv, 100); ctx.clip();
    ctx.font = '900 70px "Inter Display SR"'; ctx.letterSpacing = '4px'; ctx.fillStyle = PAL.navy; ctx.textAlign = 'center';
    ctx.fillText('DONNE DES AILES.', W / 2, 835);
    ctx.restore();
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(W / 2 - 160 * rv, 868, 320 * rv, 6);
  }
  ctx.save();
  ctx.font = '500 16px "JetBrains Mono"'; ctx.letterSpacing = '3px'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,19,53,0.7)';
  ctx.fillText(scramble('CONCEPT NON OFFICIEL · SPEC MOTION DESIGN ’26 · NON AFFILIÉ À RED BULL', prog(lt, 0.85, 1.2), lt, 5), W / 2, 950);
  ctx.restore();
}
