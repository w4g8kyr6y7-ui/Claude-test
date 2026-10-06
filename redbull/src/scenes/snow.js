// 06 — Snow. Flat parallax mountains, a rider carving S-turns toward camera,
// powder sprays at each turn apex, then a snow burst whites out into the can.
import { W, H, BEAT, E, PAL, TAU, prog, lerp, clamp, hash, circle, layout, scramble } from '../util.js';

const FAR = [[-100, 260], [180, 330], [420, 250], [700, 360], [980, 280], [1250, 390], [1500, 300], [1780, 350], [2050, 280], [2300, 330]];
const MID = [[-50, 200], [320, 270], [660, 220], [1050, 290], [1400, 230], [1760, 280], [2150, 250]];
const D = 1.42;
const HZ = 470;

function ridge(ctx, peaks, baseY, w, col, cap, off) {
  peaks.forEach(([px, h]) => {
    const x = px - off;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - w, baseY); ctx.lineTo(x, baseY - h); ctx.lineTo(x + w, baseY); ctx.fill();
    const k = 0.34, cy = baseY - h + h * k, hw = w * k;
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.moveTo(x, baseY - h); ctx.lineTo(x + hw, cy); ctx.lineTo(x + hw * 0.4, cy - 18); ctx.lineTo(x, cy + 6);
    ctx.lineTo(x - hw * 0.45, cy - 16); ctx.lineTo(x - hw, cy); ctx.closePath(); ctx.fill();
  });
}

function riderAt(t) {
  const u = clamp(t / D);
  return {
    x: lerp(380, 1480, u) + Math.sin(u * 3 * Math.PI) * lerp(70, 260, u),
    y: lerp(540, 930, E.inQuad(u)), u, sc: lerp(0.5, 1.4, u),
  };
}

function rider(ctx, t) {
  const p = riderAt(t), q = riderAt(t + 0.01);
  const dir = Math.atan2(q.y - p.y, q.x - p.x);
  const lean = -Math.cos(p.u * 3 * Math.PI) * 0.45;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.sc, p.sc);
  ctx.fillStyle = 'rgba(30,60,120,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 6, 64, 12, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.scale(1, 0.55); ctx.rotate(dir);
  ctx.fillStyle = PAL.red; ctx.beginPath(); ctx.roundRect(-58, -11, 116, 22, 11); ctx.fill();
  ctx.restore();
  ctx.rotate(lean);
  ctx.lineCap = 'round'; ctx.strokeStyle = PAL.navy; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-6, -46); ctx.moveTo(14, 0); ctx.lineTo(6, -46); ctx.stroke();
  ctx.strokeStyle = PAL.blue2; ctx.lineWidth = 24;
  ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(4, -90); ctx.stroke();
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(2, -82); ctx.lineTo(-38, -60); ctx.moveTo(6, -82); ctx.lineTo(44, -70); ctx.stroke();
  ctx.fillStyle = PAL.yellow; circle(ctx, 6, -110, 16); ctx.fill();
  ctx.fillStyle = PAL.navy; ctx.fillRect(4, -114, 20, 8);
  ctx.restore();
}

export function snow(ctx, lt) {
  const sky = ctx.createLinearGradient(0, 0, 0, HZ);
  sky.addColorStop(0, '#7FB7F5'); sky.addColorStop(1, '#E9F4FF');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(1150, 200, 30, 1150, 200, 300);
  g.addColorStop(0, 'rgba(255,214,90,0.6)'); g.addColorStop(1, 'rgba(255,214,90,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.fillStyle = PAL.yellow; circle(ctx, 1150, 200, 62); ctx.fill();

  ridge(ctx, FAR, HZ + 4, 240, '#A9C6EC', '#F4F9FF', 60 * lt);
  ridge(ctx, MID, HZ + 8, 220, '#5D8BD3', '#F4F9FF', 160 * lt);

  const slope = ctx.createLinearGradient(0, HZ, 0, H);
  slope.addColorStop(0, '#EEF5FD'); slope.addColorStop(1, '#CFE0F4');
  ctx.fillStyle = slope;
  ctx.fillRect(0, HZ, W, H - HZ);

  // carve track
  ctx.save();
  ctx.lineCap = 'round';
  for (const off of [-1, 1]) {
    ctx.strokeStyle = off < 0 ? '#AFC9EA' : '#FFFFFF';
    ctx.beginPath();
    let first = true;
    for (let t = 0; t <= lt; t += 0.01) {
      const p = riderAt(t);
      const x = p.x + off * 4 * p.sc, y = p.y + off * 2 * p.sc;
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      ctx.lineWidth = 3 + 6 * p.sc;
    }
    ctx.stroke();
  }
  ctx.restore();

  // powder sprays at each turn apex
  [1 / 6, 1 / 2, 5 / 6].forEach((u0, j) => {
    const t0 = u0 * D, a = lt - t0;
    if (a < 0 || a > 0.8) return;
    const p = riderAt(t0), side = j % 2 ? -1 : 1;
    for (let k = 0; k < 70; k++) {
      const h1 = hash(k * 1.7 + j * 31), h2 = hash(k * 2.9 + j * 17), h3 = hash(k * 4.1 + j * 7);
      const x = p.x + side * (120 + 520 * h1) * p.sc * a;
      const y = p.y - (200 + 650 * h2) * p.sc * a + 0.5 * 1700 * p.sc * a * a;
      const r = (3 + 11 * h3) * p.sc * (1 + a);
      const al = Math.max(0, 1 - a / 0.8);
      ctx.fillStyle = `rgba(60,100,170,${0.22 * al})`; circle(ctx, x + 3, y + 5, r); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${al})`; circle(ctx, x, y, r); ctx.fill();
    }
  });
  rider(ctx, lt);

  // falling snow
  for (let i = 0; i < 170; i++) {
    const sp = 120 + 260 * hash(i * 3.9), sz = 1.5 + 3.5 * hash(i * 2.7);
    const y = (hash(i * 5.1) * (H + 40) + sp * lt) % (H + 40) - 20;
    const x = ((hash(i * 1.3) * (W + 200) - 90 * lt + 30 * Math.sin(lt * 2 + i)) % (W + 200) + W + 200) % (W + 200) - 100;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    circle(ctx, x, y, sz); ctx.fill();
  }

  // type
  ctx.save();
  ctx.font = '400 300px Anton'; ctx.letterSpacing = '6px';
  const L = layout(ctx, 'GLISSE.');
  ctx.fillStyle = PAL.navy;
  L.chars.forEach((c, i) => {
    const p = prog(lt, BEAT * 0.5 + i * 0.03, BEAT * 0.5 + i * 0.03 + 0.4);
    if (p <= 0) return;
    const e = E.outExpo(p);
    ctx.save();
    ctx.translate(96 + c.x - (1 - e) * 700, 400);
    ctx.transform(1, 0, -0.18 * (1 - e) - 0.08, 1, 0, 0);
    ctx.globalAlpha = Math.min(1, p * 3);
    ctx.fillText(c.ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
  const ra = E.outExpo(prog(lt, 0.2, 0.55));
  ctx.save();
  ctx.globalAlpha = ra;
  ctx.textAlign = 'right'; ctx.fillStyle = PAL.navy;
  ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '4px';
  ctx.fillText(scramble('TEMPÉRATURE', ra, lt, 1), W - 96, 170);
  ctx.fillText(scramble('POUDREUSE · 3 200 M', ra, lt, 2), W - 96, 340);
  ctx.font = '900 130px Unbounded'; ctx.letterSpacing = '0px';
  ctx.fillText(`−${Math.round(18 * E.outCubic(prog(lt, 0.2, 0.95)))} °C`, W - 96, 300);
  ctx.restore();

  // snow burst + white-out into the can
  const wb = prog(lt, 1.15, 1.5);
  if (wb > 0) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
      const a = hash(i * 1.9) * TAU, r0 = 30 + hash(i * 3.7) * 300;
      const k = Math.exp(wb * 4.5), k0 = Math.exp(Math.max(0, wb - 0.08) * 4.5);
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, wb * 3)})`;
      ctx.lineWidth = 3 + 10 * wb;
      ctx.beginPath();
      ctx.moveTo(W / 2 + Math.cos(a) * r0 * k0, H / 2 + Math.sin(a) * r0 * k0);
      ctx.lineTo(W / 2 + Math.cos(a) * r0 * k, H / 2 + Math.sin(a) * r0 * k);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = `rgba(244,250,255,${E.inQuad(prog(lt, 1.28, 1.5))})`;
    ctx.fillRect(0, 0, W, H);
  }
}
