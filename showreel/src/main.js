// Timeline, HUD and compositor. window.SR is the hook the renderer drives.
import { W, H, FPS, DUR, BAR, E, PAL, prog, scramble, resetCtx } from './util.js';
import { initGL } from './gl.js';
import { grain, initGrain, vignette } from './fx.js';
import { intro } from './scenes/intro.js';
import { kinetic } from './scenes/kinetic.js';
import { geometry } from './scenes/geometry.js';
import { neon } from './scenes/neon.js';
import { chrome } from './scenes/chrome.js';
import { fluid } from './scenes/fluid.js';
import { craft, setRenderer } from './scenes/craft.js';
import { outro } from './scenes/outro.js';

const SEGS = [
  { name: 'GRID / TYPE', fn: intro },
  { name: 'KINETIC TYPE', fn: kinetic },
  { name: 'SHAPE & TIMING', fn: geometry },
  { name: 'LIGHT', fn: neon },
  { name: '3D / SHADING', fn: chrome },
  { name: 'FLUID', fn: fluid },
  { name: 'CRAFT', fn: craft },
  { name: 'IDENTITY', fn: outro },
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
  const a = E.outCubic(prog(t, 0.15, 0.5));
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
  ctx.fillText('CLAUDE — MOTION REEL ’26', 76, 72);
  const f = Math.round(t * FPS);
  const tc = `${String(Math.floor(f / FPS)).padStart(2, '0')}:${String(f % FPS).padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.fillText(`TC 00:00:${tc}`, W - 76, 72);
  ctx.textAlign = 'left';
  const label = `${String(i + 1).padStart(2, '0')} — ${SEGS[i].name}`;
  ctx.fillText(scramble(label, prog(lt, 0, 0.28), t, i), 76, H - 62);
  const bw = 34, gap = 6, x0 = W - 76 - (8 * bw + 7 * gap);
  for (let k = 0; k < 8; k++) {
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
  if (i === 3 || i === 6) { ctx.save(); vignette(ctx, 0.55); ctx.restore(); }
  hud(ctx, t);
  grain(ctx, Math.round(t * FPS), i === 3 ? 0.05 : 0.075);
  const fo = E.inQuad(prog(t, DUR - 0.16, DUR - 1 / FPS));
  if (fo > 0) { ctx.save(); resetCtx(ctx); ctx.fillStyle = `rgba(13,13,15,${fo})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

const FONTS = [
  '400 100px Anton', '900 100px Unbounded', '800 100px Unbounded',
  'italic 400 100px "Instrument Serif"', '400 100px "Instrument Serif"',
  '400 100px "JetBrains Mono"', '500 100px "JetBrains Mono"', '700 100px "JetBrains Mono"',
  '900 100px "Inter Display SR"', '500 100px "Inter Display SR"',
];

let ctx = null;
async function init() {
  await Promise.all(FONTS.map(f => document.fonts.load(f, 'AaBb’—•·×↓')));
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
