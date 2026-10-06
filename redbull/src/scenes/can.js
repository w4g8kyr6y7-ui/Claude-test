// 07 — Fraîcheur. The hero can: raymarched, label texture painted in a canvas,
// condensation droplets, frost, a hiss of cold mist on the beat, then the
// camera dives into the blue label.
import { W, H, BEAT, E, PAL, TAU, prog, lerp, spring, hash, circle, layout, scramble, makeCanvas } from '../util.js';
import { shade, setTexture } from '../gl.js';

let ready = false;

// Original label design (spec): blue / silver halftone diamonds, sun, wordmark. No official logo artwork.
function makeLabel() {
  const { c, x } = makeCanvas(2048, 1024);
  x.fillStyle = PAL.blue;
  x.fillRect(0, 0, 2048, 1024);
  const S = 56;
  [512, 1536].forEach(cx => {
    x.fillStyle = '#CDD1DA';
    x.fillRect(cx - 300, 0, 600, 1024);
    for (const side of [-1, 1]) {
      const edge = cx + side * 300;
      for (let col = -3; col < 3; col++) {
        for (let row = -1; row < 1024 / S + 1; row++) {
          const gx = edge + (col + 0.5) * S * side;
          const gy = row * S + (col & 1 ? S / 2 : 0);
          const dist = (col + 0.5) / 3;
          const outside = dist > 0;
          const f = outside ? 1 - dist : 1 + dist;
          const r = (S / 2) * Math.max(0, f) * 0.95;
          x.fillStyle = outside ? '#CDD1DA' : PAL.blue;
          x.beginPath(); x.moveTo(gx, gy - r); x.lineTo(gx + r, gy); x.lineTo(gx, gy + r); x.lineTo(gx - r, gy); x.fill();
        }
      }
    }
    x.fillStyle = PAL.yellow;
    x.beginPath(); x.arc(cx, 330, 128, 0, TAU); x.fill();
    x.fillStyle = PAL.red;
    x.font = '400 128px "Archivo Black"'; x.textAlign = 'center';
    x.fillText('Red Bull', cx, 620);
    x.fillStyle = PAL.navy;
    x.font = '900 40px "Inter Display SR"'; x.letterSpacing = '10px';
    x.fillText('ENERGY DRINK', cx + 5, 710);
    x.letterSpacing = '0px';
  });
  [0, 1024, 2048].forEach(cx => {
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.font = '700 34px "JetBrains Mono"'; x.textAlign = 'center'; x.letterSpacing = '6px';
    x.fillText('250 ML', cx, 960);
    x.fillStyle = PAL.yellow;
    x.fillRect(cx - 120, 60, 240, 10);
  });
  return c;
}

const CALLOUTS = [
  { a: [W / 2 - 150, H / 2 - 230], e: [470, 250], t: '250 ML · CANETTE ALU', side: -1, at: 0.3 },
  { a: [W / 2 + 150, H / 2 - 40], e: [1460, 300], t: 'SERVIR BIEN FRAIS · 4 °C', side: 1, at: 0.48 },
  { a: [W / 2 + 120, H / 2 + 250], e: [1430, 880], t: 'CONDENSATION — 100 % FRAÎCHEUR', side: 1, at: 0.66 },
];

export function can(ctx, lt) {
  if (!ready) { setTexture(makeLabel()); ready = true; }
  const dive = E.inExpo(prog(lt, 1.05, 1.5));
  const birth = spring(lt - 0.02, 1.5, 0.5);
  const pulse = Math.exp(-(lt % BEAT) * 9);
  const scale = birth * (1 + 0.02 * pulse) + 3.2 * dive;
  const rot = 0.95 + 0.55 * lt + 1.975 * E.inCubic(prog(lt, 1.05, 1.5));

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#BFE0FF'); bg.addColorStop(1, '#F2F9FF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const mist = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 700);
  mist.addColorStop(0, 'rgba(255,255,255,0.7)'); mist.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mist; ctx.fillRect(0, 0, W, H);

  // type behind the can
  ctx.save();
  const tp = E.outExpo(prog(lt, 0.02, 0.6));
  ctx.font = '900 250px Unbounded';
  ctx.letterSpacing = `${lerp(110, 2, tp)}px`;
  const L = layout(ctx, 'FRAÎCHEUR');
  const ts = Math.min(1, 1780 / L.total) * (1 + 1.6 * dive);
  ctx.translate(W / 2, H / 2 + 20); ctx.scale(ts, ts);
  ctx.globalAlpha = tp * (1 - dive);
  ctx.fillStyle = PAL.navy;
  ctx.fillText('FRAÎCHEUR', -L.total / 2, L.asc / 2);
  ctx.restore();

  // frost particles
  for (let i = 0; i < 70; i++) {
    const x = hash(i * 2.3) * W + 30 * Math.sin(lt * 1.5 + i);
    const y = (hash(i * 4.7) * H - 60 * lt * (0.5 + hash(i))) % H;
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * hash(i * 9.1)})`;
    circle(ctx, x, (y + H) % H, 1 + 3 * hash(i * 6.1)); ctx.fill();
  }

  // contact shadow
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  sh.addColorStop(0, 'rgba(20,40,90,0.4)'); sh.addColorStop(1, 'rgba(20,40,90,0)');
  ctx.save();
  ctx.translate(W / 2, H / 2 + 380);
  ctx.scale(300 * birth + 1, 40 * birth + 1);
  ctx.globalAlpha = 1 - dive;
  ctx.fillStyle = sh; circle(ctx, 0, 0, 1); ctx.fill();
  ctx.restore();

  ctx.drawImage(shade('can', {
    uRot: rot, uScale: scale, uTilt: 0.1 * Math.sin(lt * 1.6) - 0.06, uCamY: 0.9, uZoom: 1.6,
    uDew: E.outCubic(prog(lt, 0.1, 0.55)), uFrost: 0.55, uLabel: 0,
  }), 0, 0);

  // the hiss: cold mist puffs out of the top on beat 2
  const m = lt - BEAT * 2;
  if (m > 0 && m < 0.7) {
    for (let k = 0; k < 26; k++) {
      const a = -Math.PI / 2 + (hash(k * 3.3) - 0.5) * 1.6;
      const v = 250 + 450 * hash(k * 1.1);
      const x = W / 2 + Math.cos(a) * v * m, y = 230 + Math.sin(a) * v * m - 80 * m;
      const r = 20 + 120 * m * (0.5 + hash(k * 7.7));
      ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - m / 0.7)})`;
      circle(ctx, x, y, r); ctx.fill();
    }
  }

  // callouts
  ctx.save();
  ctx.globalAlpha = 1 - E.outCubic(prog(lt, 1.0, 1.15));
  ctx.strokeStyle = PAL.navy; ctx.fillStyle = PAL.navy; ctx.lineWidth = 1.5;
  ctx.font = '500 19px "JetBrains Mono"'; ctx.letterSpacing = '1px';
  CALLOUTS.forEach((c, i) => {
    const p = E.outExpo(prog(lt, c.at, c.at + 0.3));
    if (p <= 0) return;
    const [ax, ay] = c.a, [ex, ey] = c.e, mx = ex - c.side * 40;
    const s1 = Math.min(1, p * 2), s2 = Math.max(0, p * 2 - 1);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, mx, s1), lerp(ay, ey, s1));
    if (s2 > 0) ctx.lineTo(lerp(mx, ex, s2), ey);
    ctx.stroke();
    circle(ctx, ax, ay, 6 * spring(lt - c.at, 4, 0.4)); ctx.fill();
    ctx.textAlign = c.side > 0 ? 'left' : 'right';
    ctx.fillText(scramble(c.t, prog(lt, c.at + 0.1, c.at + 0.35), lt, i), ex + c.side * 14, ey + 7);
  });
  ctx.restore();

  const fl = 1 - E.outCubic(prog(lt, 0, 0.3));
  if (fl > 0) { ctx.fillStyle = `rgba(244,250,255,${fl})`; ctx.fillRect(0, 0, W, H); }
}
