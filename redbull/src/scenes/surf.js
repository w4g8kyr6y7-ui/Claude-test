// 08 — Surf / cliff diving. The blue of the can becomes the ocean: a diver
// plunges in, trailing bubbles; carbonation-like bubbles rise; liquid type.
import { W, H, BEAT, E, PAL, TAU, prog, spring, hash, circle, layout, scramble, makeCanvas } from '../util.js';
import { shade } from '../gl.js';
import { glitch } from '../fx.js';

let T = null;
const diver = t => ({ x: 1560 + 30 * Math.sin(t * 3), y: -320 + 1000 * (1 - Math.exp(-t * 2.6)) });

function body(ctx, col) {
  ctx.fillStyle = col; ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(-12, 38); ctx.lineTo(-3, 120); ctx.moveTo(12, 38); ctx.lineTo(3, 120); ctx.stroke();
  circle(ctx, 0, 66, 16); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-17, -52, 34, 96, 14); ctx.fill();
  ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(-8, -48); ctx.lineTo(-12, -150); ctx.moveTo(8, -48); ctx.lineTo(10, -150); ctx.stroke();
}

function silhouette(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(0.14);
  ctx.scale(2.1, 2.1);
  ctx.save(); ctx.translate(-2.5, -2); ctx.filter = 'blur(2px)'; body(ctx, 'rgba(140,240,255,0.75)'); ctx.restore();
  body(ctx, '#031A4A');
  ctx.fillStyle = PAL.red; ctx.fillRect(-17, -6, 34, 9);
  ctx.restore();
}

export function surf(ctx, lt, t) {
  if (!T) T = makeCanvas();
  ctx.drawImage(shade('ocean', { uT: lt * 0.9 + 2.0, uBub: E.outBack(prog(lt, 0.0, 0.5), 1.3), uIn: 1, uRays: 1 }), 0, 0);

  // diver's bubble trail
  ctx.save();
  for (let k = 0; k < 70; k++) {
    const te = lt - k * 0.018;
    if (te < 0) break;
    const age = lt - te, p = diver(te);
    const x = p.x + 16 * Math.sin(k * 1.7 + te * 8) * (1 + age * 2);
    const y = p.y - 60 - 260 * age;
    const r = (3 + 8 * hash(k * 3.1)) * (1 + age);
    const a = Math.max(0, 1 - age / 1.3);
    ctx.strokeStyle = `rgba(220,250,255,${0.75 * a})`; ctx.lineWidth = 2;
    circle(ctx, x, y, r); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.8 * a})`;
    circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.25); ctx.fill();
  }
  ctx.restore();
  silhouette(ctx, diver(lt));

  // entry splash: a burst of foam bubbles at the surface around the diver's entry
  const sa = prog(lt, 0, 0.55);
  if (sa < 1) {
    ctx.fillStyle = `rgba(235,252,255,${0.8 * (1 - sa)})`;
    ctx.fillRect(0, 0, W, 10 + 30 * (1 - sa));
    for (let k = 0; k < 90; k++) {
      const h1 = hash(k * 2.3), h2 = hash(k * 5.9), h3 = hash(k * 7.7);
      const a = (h1 - 0.5) * Math.PI * 0.9 + Math.PI / 2;
      const v = 250 + 700 * h2;
      const x = 1560 + Math.cos(a) * v * sa;
      const y = 10 + Math.sin(a) * v * sa * 0.7 - 120 * sa * sa;
      const r = (4 + 18 * h3) * (1 + sa);
      ctx.strokeStyle = `rgba(235,252,255,${0.9 * (1 - sa)})`; ctx.lineWidth = 2.5;
      circle(ctx, x, y, r); ctx.stroke();
    }
  }

  // liquid type
  const x = T.x;
  x.clearRect(0, 0, W, H);
  x.font = 'italic 400 520px "Instrument Serif"';
  x.letterSpacing = '-6px';
  const L = layout(x, 'Plonge.');
  const x0 = 110, base = H / 2 + 170;
  x.fillStyle = '#EFFFFF';
  L.chars.forEach((c, i) => {
    const s = spring(lt - BEAT * 0.5 - i * 0.045, 1.7, 0.42);
    if (s <= 0) return;
    x.save();
    x.translate(x0 + c.x + c.w / 2, base + (1 - s) * 600);
    x.rotate((1 - s) * 0.5);
    x.fillText(c.ch, -c.w / 2, 0);
    x.restore();
  });
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.filter = 'brightness(0) blur(30px)';
  ctx.drawImage(T.c, 0, 30);
  ctx.restore();
  const amp = 28 * Math.exp(-lt * 1.6) + 6;
  for (let y = base - 520; y < base + 200; y += 4) {
    const dx = Math.sin(y * 0.013 + lt * 7) * amp + Math.sin(y * 0.033 - lt * 4.3) * amp * 0.35;
    ctx.drawImage(T.c, 0, y, W, 4, dx, y, W, 4);
  }

  ctx.save();
  ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '4px'; ctx.fillStyle = '#E6FBFF';
  ctx.fillText(scramble('CLIFF DIVING · 27 M · 85 KM/H', prog(lt, 0.5, 0.85), lt, 3), 116, base + 150);
  ctx.fillText(scramble('SURF · VAGUE DE 8 M', prog(lt, 0.62, 0.95), lt, 4), 116, base + 184);
  ctx.restore();

  const fl = 1 - E.outCubic(prog(lt, 0, 0.15));
  if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${0.5 * fl})`; ctx.fillRect(0, 0, W, H); }

  const ga = prog(lt, 1.25, 1.5);
  if (ga > 0) {
    const on = hash(Math.floor(t * 24)) > 0.35 ? 1 : 0.25;
    glitch(ctx, ga * on * 0.9 + 0.08, Math.floor(t * 60));
  }
}
