// 08 — Identity. Every palette in the reel wipes through, then the red dot
// from the first frame returns and writes the wordmark.
import { W, H, BEAT, E, PAL, TAU, prog, lerp, spring, wobble, layout, scramble, badge, circle } from '../util.js';

const STACK = [PAL.red, PAL.yellow, PAL.bBlue, PAL.magenta, PAL.lavender, PAL.ink, PAL.paper];
const F_WORD = '900 270px "Inter Display SR"';
let L = null;

export function outro(ctx, lt) {
  ctx.fillStyle = STACK[0];
  ctx.fillRect(0, 0, W, H);
  for (let k = 1; k < STACK.length; k++) {
    const p = E.outExpo(prog(lt, k * 0.028, k * 0.028 + 0.5));
    if (p <= 0) continue;
    const x = -400 + (W + 800) * p;
    ctx.fillStyle = STACK[k];
    ctx.beginPath();
    ctx.moveTo(-10, -10); ctx.lineTo(x + 220, -10); ctx.lineTo(x - 220, H + 10); ctx.lineTo(-10, H + 10);
    ctx.fill();
  }

  if (!L) {
    ctx.save(); ctx.font = F_WORD; ctx.letterSpacing = '-13px';
    L = layout(ctx, 'Claude');
    ctx.restore();
  }
  const r = 36, gap = 14;
  const lockW = L.total + gap + 2 * r;
  const x0 = (W - lockW) / 2, base = H / 2 + 60;

  // dot drops to the start of the word, then sweeps right, revealing it
  const land = 0.34;
  const fall = prog(lt, 0.2, land);
  const sweep = E.inOutExpo(prog(lt, BEAT, BEAT + 0.42));
  const startX = x0 + r, endX = x0 + L.total + gap + r;
  const dx = lerp(startX, endX, sweep);
  const dy = base - r - (1 - E.inQuad(fall)) * 700;

  ctx.save();
  ctx.font = F_WORD; ctx.letterSpacing = '-13px'; ctx.fillStyle = PAL.ink;
  ctx.beginPath(); ctx.rect(0, 0, dx - r * (1 - 0.8 * Math.min(1, sweep * 5)), H); ctx.clip();
  L.chars.forEach(c => {
    const rp = Math.max(0, Math.min(1, (dx - (x0 + c.x)) / (c.w + 40)));
    const yo = (1 - E.outBack(rp, 2)) * 70;
    ctx.fillText(c.ch, x0 + c.x, base + yo);
  });
  ctx.restore();

  if (fall > 0) {
    const k = wobble(lt - land, 11, 34);
    const vel = Math.abs(Math.sin(Math.PI * prog(lt, BEAT, BEAT + 0.42)));
    const k2 = wobble(lt - BEAT - 0.42, 12, 36);
    const beatPulse = wobble(lt - BEAT * 3, 9, 30) * 0.3;
    ctx.save();
    ctx.translate(dx, dy + r);
    ctx.scale((1 + 0.35 * k) * (1 + 0.5 * vel) * (1 - 0.25 * k2), (1 - 0.35 * k) * (1 - 0.2 * vel) * (1 + 0.25 * k2));
    ctx.fillStyle = PAL.red;
    circle(ctx, 0, -r, r * (1 + beatPulse * 0.4)); ctx.fill();
    ctx.restore();
    // heartbeat ring on the last bar
    const q = prog(lt, BEAT * 3, BEAT * 3 + 0.45);
    if (q > 0 && q < 1) {
      ctx.strokeStyle = `rgba(255,61,31,${1 - q})`; ctx.lineWidth = 3;
      circle(ctx, dx, dy, r + 90 * E.outCubic(q)); ctx.stroke();
    }
  }

  // rule + tagline + details
  const rl = E.outExpo(prog(lt, 0.86, 1.3));
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x0, base + 62, lockW * rl, 3);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - 20, base + 66, lockW + 40, 120); ctx.clip();
  ctx.font = 'italic 400 84px "Instrument Serif"';
  const tp = E.outExpo(prog(lt, BEAT * 2, BEAT * 2 + 0.5));
  ctx.fillText('Motion Designer', x0, base + 150 + (1 - tp) * 110);
  ctx.restore();
  ctx.save();
  ctx.font = '500 19px "JetBrains Mono"'; ctx.letterSpacing = '2px'; ctx.textAlign = 'right';
  ctx.fillText(scramble('SHOWREEL ’26', prog(lt, 1.05, 1.3), lt, 1), x0 + lockW, base + 112);
  ctx.fillText(scramble('2D · 3D · TYPE · FX · SOUND', prog(lt, 1.12, 1.45), lt, 2), x0 + lockW, base + 144);
  ctx.restore();

  // available pill
  const pp = spring(lt - 1.15, 3, 0.4);
  if (pp > 0) {
    ctx.save();
    ctx.translate(x0, base - 300);
    ctx.scale(pp, pp);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(0, -26, 372, 52, 26); ctx.stroke();
    ctx.fillStyle = (Math.floor(lt * 4) % 2) ? PAL.red : 'rgba(255,61,31,0.35)';
    circle(ctx, 28, 0, 8); ctx.fill();
    ctx.fillStyle = PAL.ink; ctx.font = '500 18px "JetBrains Mono"'; ctx.letterSpacing = '1px';
    ctx.fillText('AVAILABLE FOR NEW PROJECTS', 48, 6);
    ctx.restore();
  }
  // badge returns
  const bs = spring(lt - 1.0, 3, 0.35);
  if (bs > 0) {
    ctx.save();
    ctx.translate(x0 + lockW - 70, base - 330);
    ctx.scale(bs, bs);
    ctx.fillStyle = PAL.red; circle(ctx, 0, 0, 100); ctx.fill();
    badge(ctx, 0, 0, 78, 'MOTION • DESIGN • 2026 • REEL • ', -lt * 1.2, '700 16px "JetBrains Mono"', PAL.paper);
    ctx.fillStyle = PAL.paper; ctx.font = 'italic 400 64px "Instrument Serif"'; ctx.textAlign = 'center';
    ctx.fillText('C.', 0, 20);
    ctx.restore();
  }
}
