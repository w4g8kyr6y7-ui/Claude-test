// Post effects: glitch (pixel-level), bloom, film grain.
import { W, H, hash, hash2, makeCanvas } from './util.js';

// Channel split + band displacement + streaks + scanlines, all on raw pixels.
export function glitch(ctx, amount, seed) {
  if (amount <= 0.001) return;
  const img = ctx.getImageData(0, 0, W, H);
  const src = img.data;
  const out = new Uint8ClampedArray(src.length);
  const split = Math.round(6 + amount * 34 * hash(seed + 0.3));
  const rowShift = new Int32Array(H);
  const streak = new Int32Array(H).fill(-1);
  const bands = Math.floor(4 + amount * 14);
  for (let b = 0; b < bands; b++) {
    const y0 = Math.floor(hash2(seed, b) * H);
    const bh = Math.floor(4 + hash2(seed + 7, b) * 90 * amount);
    const dx = Math.round((hash2(seed + 3, b) - 0.5) * 520 * amount);
    const isStreak = hash2(seed + 11, b) > 0.78;
    const sx = Math.floor(hash2(seed + 5, b) * W);
    for (let y = y0; y < Math.min(H, y0 + bh); y++) {
      rowShift[y] = dx;
      if (isStreak) streak[y] = sx;
    }
  }
  const scan = 1 - 0.18 * amount;
  for (let y = 0; y < H; y++) {
    const dx = rowShift[y], sx = streak[y], row = y * W * 4;
    const dim = y & 1 ? scan : 1;
    for (let x = 0; x < W; x++) {
      let bx = x - dx;
      if (sx >= 0 && x > sx) bx = sx;
      const xr = Math.min(W - 1, Math.max(0, bx + split));
      const xg = Math.min(W - 1, Math.max(0, bx));
      const xb = Math.min(W - 1, Math.max(0, bx - split));
      const o = row + x * 4;
      out[o] = src[row + xr * 4] * dim;
      out[o + 1] = src[row + xg * 4 + 1] * dim;
      out[o + 2] = src[row + xb * 4 + 2] * dim;
      out[o + 3] = 255;
    }
  }
  ctx.putImageData(new ImageData(out, W, H), 0, 0);
}

// Additive bloom of a layer onto ctx.
export function bloom(ctx, layer, strength = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.9 * strength;
  ctx.filter = 'blur(48px)';
  ctx.drawImage(layer, 0, 0);
  ctx.globalAlpha = 0.85 * strength;
  ctx.filter = 'blur(14px)';
  ctx.drawImage(layer, 0, 0);
  ctx.filter = 'blur(3px)';
  ctx.globalAlpha = 1;
  ctx.drawImage(layer, 0, 0);
  ctx.filter = 'none';
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

const grains = [];
export function initGrain() {
  for (let k = 0; k < 6; k++) {
    const { c, x } = makeCanvas(384, 384);
    const img = x.createImageData(384, 384);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() + Math.random() + Math.random() - 1.5) * 150;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    grains.push(c);
  }
}

export function grain(ctx, frame, amount = 0.07) {
  const g = grains[frame % grains.length];
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount;
  const pat = ctx.createPattern(g, 'repeat');
  ctx.translate(Math.floor(hash(frame) * 384), Math.floor(hash(frame + 99) * 384));
  ctx.fillStyle = pat;
  ctx.fillRect(-384, -384, W + 768, H + 768);
  ctx.restore();
}

export function vignette(ctx, amount = 0.5, color = '0,0,0') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
