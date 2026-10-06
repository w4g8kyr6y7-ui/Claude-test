// 03 — F1. Kerb-coloured shader tunnel, radial light streaks, a speedometer
// that shifts gear on every beat (with steering-wheel shift lights), then white-out.
import { W, H, BEAT, E, PAL, TAU, prog, lerp, spring, hash, circle, makeCanvas, layout } from '../util.js';
import { shade } from '../gl.js';
import { bloom } from '../fx.js';

let G = null;
const LED = ['#2BE36B', '#2BE36B', '#2BE36B', '#2BE36B', '#2BE36B', '#FF2340', '#FF2340', '#FF2340', '#FF2340', '#FF2340', '#3E7BFF', '#3E7BFF', '#3E7BFF', '#3E7BFF', '#3E7BFF'];

const speed = lt => {
  let v = 342 * (1 - Math.exp(-lt * 2.6));
  for (let k = 1; k <= 3; k++) if (lt >= k * BEAT) v -= 16 * Math.exp(-(lt - k * BEAT) * 14);
  return Math.max(0, v);
};

export function f1(ctx, lt) {
  if (!G) G = makeCanvas();
  const out = E.inCubic(prog(lt, 1.1, 1.5));
  const z = 7 * lt + 5 * (1 - Math.exp(-lt * 6)) + 22 * out;
  const roll = 0.12 * Math.sin(lt * 2.2) + 1.6 * out;
  const pulse = Math.exp(-(lt % BEAT) * 9);
  const fade = E.outCubic(prog(lt, 0.0, 0.25));
  ctx.drawImage(shade('tunnel', { uZ: z, uRoll: roll, uFade: fade, uPulse: pulse, uA: [1, 0.08, 0.2], uB: [1, 1, 1], uC: [0.2, 0.42, 1] }), 0, 0);

  const plate = ctx.createRadialGradient(W / 2, H / 2 + 40, 60, W / 2, H / 2 + 40, 760);
  plate.addColorStop(0, `rgba(5,10,30,${0.82 * fade})`);
  plate.addColorStop(1, 'rgba(5,10,30,0)');
  ctx.fillStyle = plate;
  ctx.fillRect(0, 0, W, H);

  const g = G.x;
  g.clearRect(0, 0, W, H);
  // radial light streaks (tail lights / track lights)
  g.lineCap = 'round';
  const sp = 1 + 3 * out;
  for (let i = 0; i < 110; i++) {
    const a = hash(i * 1.37) * TAU;
    const T = 0.35 + hash(i * 2.11) * 0.35;
    const s = ((lt * sp + hash(i * 4.2) * T) % T) / T;
    const r1 = 90 * Math.exp(s * 3.6), r0 = r1 * 0.8;
    const al = Math.min(1, s * 3) * fade;
    g.strokeStyle = i % 3 === 0 ? `rgba(255,30,60,${al})` : `rgba(255,255,255,${al * 0.8})`;
    g.lineWidth = 1 + s * 5;
    g.beginPath();
    g.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0 * 0.75);
    g.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1 * 0.75);
    g.stroke();
  }
  // entry: the horizontal speed lines of ADRÉNALINE carry over
  const ent = 1 - prog(lt, 0, 0.25);
  if (ent > 0) {
    for (let i = 0; i < 46; i++) {
      const y = hash(i * 7.1) * H, len = 400 + hash(i * 5.7) * 900;
      const x = W - ((lt + 0.375) * (3000 + hash(i * 3.3) * 3000) + hash(i) * 3000) % (W + 1400);
      g.fillStyle = i % 4 === 0 ? `rgba(226,23,61,${ent})` : `rgba(255,255,255,${0.7 * ent})`;
      g.fillRect(x, y, len, 2 + hash(i * 9.9) * 4);
    }
  }

  // dashboard: speed, gear, shift lights
  const zs = 1 + 3.5 * E.inCubic(prog(lt, BEAT * 3, 1.45));
  const da = 1 - E.inQuad(prog(lt, 1.2, 1.45));
  const intro = spring(lt - 0.02, 3, 0.45);
  g.save();
  g.globalAlpha = Math.max(0, da);
  g.translate(W / 2, H / 2); g.scale(zs * intro, zs * intro); g.translate(-W / 2, -H / 2);
  g.font = '900 300px Unbounded'; g.textAlign = 'center'; g.fillStyle = '#fff';
  g.fillText(String(Math.round(speed(lt))), W / 2 - 60, H / 2 + 120);
  g.font = '500 30px "JetBrains Mono"'; g.letterSpacing = '10px'; g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText('KM/H', W / 2 - 60, H / 2 + 190);
  const gear = Math.min(8, 5 + Math.floor(lt / BEAT));
  const gx = W / 2 + 470, gy = H / 2 - 90;
  g.strokeStyle = PAL.yellow; g.lineWidth = 4;
  g.beginPath(); g.roundRect(gx - 80, gy, 160, 200, 18); g.stroke();
  g.fillStyle = PAL.yellow; g.font = '900 150px Unbounded'; g.letterSpacing = '0px';
  const gp = 1 + 0.35 * Math.exp(-(lt % BEAT) * 16);
  g.save(); g.translate(gx, gy + 160); g.scale(gp, gp); g.fillText(String(gear), 0, 0); g.restore();
  g.font = '500 18px "JetBrains Mono"'; g.letterSpacing = '4px'; g.fillStyle = 'rgba(255,255,255,0.75)';
  g.fillText('RAPPORT', gx, gy + 236);
  // shift lights
  const r = (lt % BEAT) / BEAT;
  const rpm = 0.4 + 0.6 * E.outQuad(r);
  const lit = Math.floor(rpm * 15);
  const flash = rpm > 0.93 && Math.floor(lt * 30) % 2 === 0;
  for (let k = 0; k < 15; k++) {
    const x = W / 2 - 7 * 44 + k * 44, y = H / 2 - 250;
    g.fillStyle = flash ? '#3E7BFF' : k < lit ? LED[k] : 'rgba(255,255,255,0.08)';
    circle(g, x, y, 14); g.fill();
  }
  g.restore();
  bloom(ctx, G.c, 0.7);

  ctx.save();
  ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '3px'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.globalAlpha = Math.max(0, da) * fade;
  ctx.fillText('F1 — VITESSE PURE', 96, 170);
  ctx.fillText('0–100 KM/H · 2,6 S', 96, 202);
  ctx.textAlign = 'right';
  ctx.fillText(`G-FORCE ${(1 + 4.2 * (1 - Math.exp(-lt * 3))).toFixed(1).replace('.', ',')} G`, W - 96, 170);
  ctx.restore();

  const wf = E.inQuad(prog(lt, 1.3, 1.5));
  if (wf > 0) { ctx.fillStyle = `rgba(255,255,255,${wf})`; ctx.fillRect(0, 0, W, H); }
}
