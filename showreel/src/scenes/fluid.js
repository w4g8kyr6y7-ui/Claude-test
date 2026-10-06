// 06 — Fluid. Domain-warped gradient with glossy metaballs; liquid type that
// settles like jelly, until a glitch tears through it.
import { W, H, E, prog, spring, layout, scramble, hash, makeCanvas } from '../util.js';
import { shade } from '../gl.js';
import { glitch } from '../fx.js';

let T = null;

export function fluid(ctx, lt, t) {
  if (!T) T = makeCanvas();
  const blob = E.outBack(prog(lt, 0.0, 0.7), 1.3);
  ctx.drawImage(shade('fluid', { uT: lt * 0.9 + 3.0, uBlob: blob, uIn: 1 }), 0, 0);

  const x = T.x;
  x.clearRect(0, 0, W, H);
  x.font = 'italic 400 640px "Instrument Serif"';
  x.letterSpacing = '-8px';
  const L = layout(x, 'fluid');
  const x0 = (W - L.total) / 2 - 10, base = H / 2 + 190;
  x.fillStyle = '#FFF3EA';
  L.chars.forEach((c, i) => {
    const s = spring(lt - 0.04 - i * 0.055, 1.6, 0.42);
    if (s <= 0) return;
    x.save();
    x.translate(x0 + c.x + c.w / 2, base + (1 - s) * 620);
    x.rotate((1 - s) * 0.5);
    x.scale(1 + (1 - s) * 0.2, 1 - (1 - s) * 0.2);
    x.fillText(c.ch, -c.w / 2, 0);
    x.restore();
  });

  // soft drop shadow
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.filter = 'brightness(0) blur(34px)';
  ctx.drawImage(T.c, 0, 36);
  ctx.restore();

  // liquid wobble: draw the type in thin horizontal slices offset by travelling waves
  const amp = 30 * Math.exp(-lt * 1.7) + 6;
  const SL = 4;
  for (let y = base - 620; y < base + 240; y += SL) {
    const dx = Math.sin(y * 0.013 + lt * 7) * amp + Math.sin(y * 0.033 - lt * 4.3) * amp * 0.35;
    ctx.drawImage(T.c, 0, y, W, SL, dx, y, W, SL);
  }

  ctx.save();
  ctx.font = '500 22px "JetBrains Mono"';
  ctx.letterSpacing = '8px';
  ctx.fillStyle = '#FFF3EA';
  ctx.textAlign = 'center';
  ctx.fillText(scramble('MOTION THAT BREATHES', prog(lt, 0.9, 1.25), lt, 3), W / 2, base + 170);
  ctx.restore();

  // the glitch eats in on the last off-beats
  const ga = prog(lt, 1.6, 1.875);
  if (ga > 0) {
    const f = Math.floor(t * 60);
    const on = hash(Math.floor(t * 24)) > 0.35 ? 1 : 0.25;
    glitch(ctx, ga * on * 0.9 + 0.08, f);
  }
}
