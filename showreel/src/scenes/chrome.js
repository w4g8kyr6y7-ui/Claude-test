// 05 — 3D. A raymarched iridescent chrome form is born from the flash,
// sandwiched in front of the type, then the camera dives into its surface.
import { W, H, BEAT, E, PAL, prog, lerp, spring, layout, scramble, circle } from '../util.js';
import { shade } from '../gl.js';

const CALLOUTS = [
  { a: [W / 2 - 170, H / 2 - 110], e: [430, 250], t: 'SDF RAYMARCH — 110 STEPS', side: -1, at: 0.3 },
  { a: [W / 2 + 190, H / 2 - 40], e: [1500, 250], t: 'IRIDESCENT THIN-FILM', side: 1, at: 0.55 },
  { a: [W / 2 + 60, H / 2 + 220], e: [1450, 900], t: 'SMOOTH-MIN BLEND  k=0.45', side: 1, at: 0.8 },
];

export function chrome(ctx, lt) {
  const merge = E.inOutCubic(prog(lt, 1.2, 1.65));
  const dive = E.inExpo(prog(lt, 1.42, 1.875));
  const birth = spring(lt - 0.02, 1.7, 0.42);
  const pulse = Math.exp(-(lt % BEAT) * 8);
  const scale = birth * (1 + 0.04 * pulse) + dive * 3.6;
  const T = lt * 1.5 + 0.6;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#AF9FFF');
  bg.addColorStop(0.55, '#F4C3DD');
  bg.addColorStop(1, '#FFDDC6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(W / 2, H / 2 - 40, 0, W / 2, H / 2 - 40, 640);
  sun.addColorStop(0, 'rgba(255,255,255,0.55)');
  sun.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // type behind the object
  const tp = E.outExpo(prog(lt, 0.04, 0.75));
  ctx.save();
  const F = '900 410px Unbounded';
  ctx.font = F;
  ctx.letterSpacing = `${lerp(150, 4, tp)}px`;
  const L = layout(ctx, 'DEPTH');
  const ts = 1 + dive * 2.2;
  ctx.translate(W / 2, H / 2);
  ctx.scale(ts, ts);
  ctx.globalAlpha = tp * (1 - dive);
  ctx.fillStyle = PAL.violet;
  ctx.fillText('DEPTH', -L.total / 2, L.asc / 2);
  ctx.restore();

  // contact shadow
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  sh.addColorStop(0, 'rgba(40,16,70,0.42)');
  sh.addColorStop(1, 'rgba(40,16,70,0)');
  ctx.save();
  ctx.translate(W / 2, H / 2 + 400);
  ctx.scale(430 * birth * (1 - 0.1 * pulse) + 1, 48 * birth + 1);
  ctx.globalAlpha = 1 - dive;
  ctx.fillStyle = sh;
  circle(ctx, 0, 0, 1); ctx.fill();
  ctx.restore();

  ctx.drawImage(shade('chrome', { uT: T, uScale: scale, uPulse: pulse, uMerge: merge, uCamA: 0.3 * Math.sin(lt * 0.9) }), 0, 0);

  // technical callouts
  ctx.save();
  ctx.globalAlpha = 1 - E.outCubic(prog(lt, 1.3, 1.5));
  ctx.strokeStyle = PAL.violet; ctx.fillStyle = PAL.violet; ctx.lineWidth = 1.5;
  ctx.font = '500 19px "JetBrains Mono"'; ctx.letterSpacing = '1px';
  CALLOUTS.forEach((c, i) => {
    const p = E.outExpo(prog(lt, c.at, c.at + 0.35));
    if (p <= 0) return;
    const [ax, ay] = c.a, [ex, ey] = c.e;
    const mx = ex - c.side * 40;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    const seg1 = Math.min(1, p * 2), seg2 = Math.max(0, p * 2 - 1);
    ctx.lineTo(lerp(ax, mx, seg1), lerp(ay, ey, seg1));
    if (seg2 > 0) ctx.lineTo(lerp(mx, ex, seg2), ey);
    ctx.stroke();
    circle(ctx, ax, ay, 6 * spring(lt - c.at, 4, 0.4)); ctx.fill();
    ctx.textAlign = c.side > 0 ? 'left' : 'right';
    ctx.fillText(scramble(c.t, prog(lt, c.at + 0.12, c.at + 0.4), lt, i), ex + c.side * 14, ey + 7);
  });
  ctx.restore();

  const fl = 1 - E.outCubic(prog(lt, 0, 0.32));
  if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, W, H); }
}
