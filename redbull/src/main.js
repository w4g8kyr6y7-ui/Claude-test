// Timeline, HUD and compositor. window.SR is the hook the renderer drives.
import { W, H, FPS, DUR, BAR, E, PAL, prog, scramble, resetCtx } from './util.js';
import { initGL } from './gl.js';
import { grain, initGrain, vignette } from './fx.js';
import { start } from './scenes/start.js';
import { kinetic } from './scenes/kinetic.js';
import { f1 } from './scenes/f1.js';
import { wingsuit } from './scenes/wingsuit.js';
import { fmx } from './scenes/fmx.js';
import { snow } from './scenes/snow.js';
import { can } from './scenes/can.js';
import { surf } from './scenes/surf.js';
import { telemetry, setRenderer } from './scenes/telemetry.js';
import { outro } from './scenes/outro.js';

const SEGS = [
  { name: 'DÉPART', fn: start },
  { name: 'ÉNERGIE', fn: kinetic },
  { name: 'F1 / VITESSE', fn: f1, dark: true },
  { name: 'WINGSUIT', fn: wingsuit },
  { name: 'FMX', fn: fmx },
  { name: 'SNOW', fn: snow },
  { name: 'FRAÎCHEUR', fn: can },
  { name: 'SURF / CLIFF', fn: surf },
  { name: 'TÉLÉMÉTRIE', fn: telemetry, dark: true },
  { name: 'DONNE DES AILES', fn: outro },
];

const segIndex = t => Math.max(0, Math.min(SEGS.length - 1, Math.floor(t / BAR + 1e-9)));

export function drawScene(ctx, t) {
  const i = segIndex(t);
  ctx.save();
  resetCtx(ctx);
  SEGS[i].fn(ctx, t - i * BAR, t);
  ctx.restore();
}
setRenderer(drawScene);

function hud(ctx, t) {
  const i = segIndex(t), lt = t - i * BAR;
  const a = E.outCubic(prog(t, 0.1, 0.4));
  if (a <= 0) return;
  ctx.save();
  resetCtx(ctx);
  ctx.globalCompositeOperation = 'difference';
  ctx.globalAlpha = a;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  const m = 40, s = 26;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + dy * s); ctx.lineTo(x, y); ctx.lineTo(x + dx * s, y); ctx.stroke();
  });
  ctx.font = '500 17px "JetBrains Mono"';
  ctx.letterSpacing = '2px';
  ctx.fillText('RED BULL — CONCEPT NON OFFICIEL', 76, 72);
  const f = Math.round(t * FPS);
  const tc = `${String(Math.floor(f / FPS)).padStart(2, '0')}:${String(f % FPS).padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.fillText(`TC 00:00:${tc}`, W - 76, 72);
  ctx.textAlign = 'left';
  const label = `${String(i + 1).padStart(2, '0')} — ${SEGS[i].name}`;
  ctx.fillText(scramble(label, prog(lt, 0, 0.22), t, i), 76, H - 62);
  const n = SEGS.length, bw = 28, gap = 5, x0 = W - 76 - (n * bw + (n - 1) * gap);
  for (let k = 0; k < n; k++) {
    const x = x0 + k * (bw + gap);
    ctx.globalAlpha = a * 0.35;
    ctx.fillRect(x, H - 72, bw, 4);
    ctx.globalAlpha = a;
    const fill = k < i ? 1 : k === i ? lt / BAR : 0;
    if (fill > 0) ctx.fillRect(x, H - 72, bw * fill, 4);
  }
  ctx.restore();
}

export function renderFrame(ctx, t) {
  drawScene(ctx, t);
  const i = segIndex(t);
  if (SEGS[i].dark) { ctx.save(); vignette(ctx, 0.5); ctx.restore(); }
  hud(ctx, t);
  grain(ctx, Math.round(t * FPS), 0.07);
  const fo = E.inQuad(prog(t, DUR - 0.16, DUR - 1 / FPS));
  if (fo > 0) { ctx.save(); resetCtx(ctx); ctx.fillStyle = `rgba(5,10,30,${fo})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

const FONTS = [
  '400 100px Anton', '400 100px "Archivo Black"', '900 100px Unbounded', '800 100px Unbounded',
  'italic 400 100px "Instrument Serif"', '400 100px "Instrument Serif"',
  '400 100px "JetBrains Mono"', '500 100px "JetBrains Mono"', '700 100px "JetBrains Mono"',
  '900 100px "Inter Display SR"', '500 100px "Inter Display SR"',
];

let ctx = null;
async function init() {
  await Promise.all(FONTS.map(f => document.fonts.load(f, 'AaBbÉÈÊÎÂÔ’—•·×↓°−')));
  await document.fonts.ready;
  initGL();
  initGrain();
  const c = document.getElementById('c');
  c.width = W; c.height = H;
  ctx = c.getContext('2d', { alpha: false });
  return { W, H, FPS, DUR };
}

window.SR = {
  init,
  frame: t => { renderFrame(ctx, t); return true; },
  PAL,
};
