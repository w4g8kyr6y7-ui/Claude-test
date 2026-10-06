// 04 — Light. Tile dots streak into a warp, a shader tunnel races past and a
// neon sign ignites, then everything collapses into a single point of light.
import { W, H, BEAT, E, PAL, TAU, prog, lerp, hash, circle, makeCanvas, layout } from '../util.js';
import { shade } from '../gl.js';
import { bloom } from '../fx.js';
import { TILE_DOTS } from './geometry.js';

let G = null;
const STARS = [
  ...TILE_DOTS.map(d => ({ x: d.x, y: d.y, c: d.k % 2 })),
  ...Array.from({ length: 180 }, (_, i) => {
    const a = hash(i * 3.1) * TAU, r = 40 + hash(i * 7.7) ** 0.7 * 950;
    return { x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r * 0.62, c: i % 2 };
  }),
];
const COLS = ['46,242,255', '255,43,214'];

function lit(lt, i, start) {
  const x = lt - start - [0, 0.028, 0.06, 0.012, 0.042, 0.02, 0.05][i % 7];
  if (x < 0) return 0;
  if (x < 0.035) return 1;
  if (x < 0.07) return 0.08;
  if (x < 0.09) return 0.8;
  if (x < 0.125) return 0.04;
  return 1;
}

function sign(c, lt, unlit, tsc) {
  const F1 = '800 290px Unbounded', F2 = 'italic 400 140px "Instrument Serif"';
  c.save();
  c.translate(W / 2, H / 2);
  c.rotate((1 - tsc) * 1.4);
  c.scale(tsc, tsc);
  c.translate(-W / 2, -H / 2);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.font = F1; c.letterSpacing = '26px';
  const L1 = layout(c, 'LIGHT');
  const x1 = (W - L1.total + 26) / 2, b1 = H / 2 + 60;
  c.font = F2; c.letterSpacing = '2px';
  const L2 = layout(c, '& atmosphere');
  const x2 = (W - L2.total) / 2 + 120, b2 = b1 + 170;
  const draw = (Lx, x0, base, font, ls, col, wTube, start, sub) => {
    c.font = font; c.letterSpacing = ls;
    Lx.chars.forEach((ch, i) => {
      if (ch.ch === ' ') return;
      if (unlit) {
        c.strokeStyle = 'rgba(70,40,90,0.55)'; c.lineWidth = wTube;
        c.strokeText(ch.ch, x0 + ch.x, base);
        return;
      }
      let b = lit(lt, i + sub, start);
      if (!sub && i === 2 && ((lt > 0.98 && lt < 1.02) || (lt > 1.22 && lt < 1.245))) b = 0.12;
      if (b <= 0) return;
      c.globalAlpha = b;
      c.strokeStyle = `rgb(${col})`; c.lineWidth = wTube;
      c.strokeText(ch.ch, x0 + ch.x, base);
      c.strokeStyle = '#fff6fe'; c.lineWidth = wTube * 0.3;
      c.strokeText(ch.ch, x0 + ch.x, base);
      c.globalAlpha = 1;
    });
  };
  draw(L1, x1, b1, F1, '26px', COLS[1], 10, BEAT, 0);
  draw(L2, x2, b2, F2, '2px', COLS[0], 6, BEAT * 2, 3);
  c.restore();
}

export function neon(ctx, lt) {
  if (!G) G = makeCanvas();
  const out = E.inCubic(prog(lt, 1.35, 1.875));
  const z = 5.5 * lt + 4 * (1 - Math.exp(-lt * 5)) + 18 * out;
  const roll = 0.18 * Math.sin(lt * 1.6) + 2.6 * out;
  const pulse = Math.exp(-(lt % BEAT) * 9);
  const fade = E.outCubic(prog(lt, 0.05, 0.5));
  ctx.drawImage(shade('tunnel', { uZ: z, uRoll: roll, uFade: fade, uPulse: pulse }), 0, 0);

  // dark plate so the sign reads against the tunnel
  const plate = ctx.createRadialGradient(W / 2, H / 2 + 60, 80, W / 2, H / 2 + 60, 820);
  plate.addColorStop(0, `rgba(6,3,15,${0.8 * fade})`);
  plate.addColorStop(1, 'rgba(6,3,15,0)');
  ctx.fillStyle = plate;
  ctx.fillRect(0, 0, W, H);

  const tsc = 1 - E.inCubic(prog(lt, BEAT * 3, 1.8));
  if (tsc > 0.002) sign(ctx, lt, true, tsc);

  const g = G.x;
  g.clearRect(0, 0, W, H);

  // warp: the tile dots from the last scene become stars
  const wv = 1 - prog(lt, 0.25, 0.65);
  if (wv > 0) {
    g.lineCap = 'round';
    STARS.forEach((s, i) => {
      const dx = s.x - W / 2, dy = s.y - H / 2;
      const k = 3.6 + hash(i) * 1.5;
      const a = Math.exp(k * lt), b = Math.exp(k * Math.max(0, lt - 0.07));
      g.strokeStyle = `rgba(${COLS[s.c]},${wv})`;
      g.lineWidth = i < 25 ? 6 : 2.5;
      g.beginPath();
      g.moveTo(W / 2 + dx * b, H / 2 + dy * b);
      g.lineTo(W / 2 + dx * a + 0.01, H / 2 + dy * a);
      g.stroke();
    });
  }

  // light-painting trails
  const vis = E.outCubic(prog(lt, 0.12, 0.4)) * (1 - prog(lt, 1.45, 1.7));
  if (vis > 0) {
    g.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const pt = s => ({
        x: W / 2 + 880 * tsc * Math.sin(1.25 * s + k * Math.PI),
        y: H / 2 + 380 * tsc * Math.sin(2.1 * s + 0.6 + k * 1.4),
      });
      const s0 = lt * 2.5 + 0.4;
      let prev = pt(s0);
      for (let j = 1; j <= 56; j++) {
        const p = pt(s0 - j * 0.017);
        const f = 1 - j / 56;
        g.strokeStyle = `rgba(${COLS[k]},${vis * f})`;
        g.lineWidth = 2 + 9 * f;
        g.beginPath(); g.moveTo(prev.x, prev.y); g.lineTo(p.x, p.y); g.stroke();
        prev = p;
      }
      const h = pt(s0);
      g.fillStyle = `rgba(255,255,255,${vis})`;
      circle(g, h.x, h.y, 7); g.fill();
    }
  }
  if (tsc > 0.002) sign(g, lt, false, tsc);
  bloom(ctx, G.c, 1);

  // collapse into a point of light, then white
  const fl = E.inExpo(prog(lt, 1.45, 1.875));
  if (fl > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = 30 + 1500 * fl;
    const gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, `rgba(255,200,255,${0.8})`);
    gr.addColorStop(1, 'rgba(120,60,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  const wf = E.inQuad(prog(lt, 1.7, 1.875));
  if (wf > 0) { ctx.fillStyle = `rgba(255,255,255,${wf})`; ctx.fillRect(0, 0, W, H); }
}
