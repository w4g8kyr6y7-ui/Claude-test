// Shared timing, easing, noise and drawing helpers.
// Every scene is a pure function of time, so any frame can be rendered in isolation.

export const W = 1920, H = 1080, FPS = 60, DUR = 15;
export const BPM = 160, BEAT = 60 / BPM, BAR = BEAT * 4; // 40 beats == 10 bars == exactly 15s
export const S8 = BEAT / 2, S16 = BEAT / 4;
export const TAU = Math.PI * 2;

// Brand-evoking palette (spec concept): can blue & silver, sun yellow, red.
export const PAL = {
  navy: '#0A1335', night: '#050A1E', blue: '#1D3F96', blue2: '#2E62D0', silver: '#D5D9E1', silver2: '#9AA1B1',
  red: '#E2173D', yellow: '#FFC20E', paper: '#F3F2EE', white: '#FFFFFF', ice: '#E6F4FF', sky: '#1C3F9A',
  teal: '#00A6C8', orange: '#FF7A1A',
};

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));

export const E = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inCubic: t => t * t * t,
  outCubic: t => 1 - (1 - t) ** 3,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outQuart: t => 1 - (1 - t) ** 4,
  inOutQuart: t => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  inExpo: t => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  outExpo: t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  outBounce: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

// Closed-form damped spring step response (0 -> 1).
export function spring(t, freq = 3, zeta = 0.4) {
  if (t <= 0) return 0;
  const w = TAU * freq, wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
}

// Decaying oscillation used for squash & stretch after an impact (1 at impact).
export const wobble = (t, damp = 10, freq = 34) => (t < 0 ? 0 : Math.exp(-t * damp) * Math.cos(t * freq));

export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
export const hash2 = (a, b) => hash(a * 57.13 + b * 91.71);

export function vnoise(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u) * 2 - 1;
}

export function shake(t, t0, amp, decay = 9, seed = 0) {
  const d = t - t0;
  if (d < 0) return { x: 0, y: 0 };
  const a = amp * Math.exp(-d * decay);
  return { x: a * vnoise(d * 38 + seed * 10), y: a * vnoise(d * 41 + seed * 10 + 50) };
}

// Per-character x offsets for the current ctx font (kerning-aware).
export function layout(ctx, str) {
  const chars = [];
  for (let i = 0; i < str.length; i++) {
    chars.push({ ch: str[i], x: ctx.measureText(str.slice(0, i)).width, w: ctx.measureText(str[i]).width });
  }
  const m = ctx.measureText(str);
  return { chars, total: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/*+=<>';
// Decode-style text reveal: characters lock in left to right, the rest flicker.
export function scramble(str, p, t, seed = 0) {
  if (p >= 1) return str;
  if (p <= 0) return '';
  const n = str.length, locked = Math.floor(p * n * 1.15), shown = Math.ceil(p * n * 1.6);
  const tick = Math.floor(t * 30);
  let out = '';
  for (let i = 0; i < Math.min(n, shown); i++) {
    const c = str[i];
    if (i < locked || c === ' ') out += c;
    else out += GLYPHS[Math.floor(hash2(i + seed * 13, tick) * GLYPHS.length)];
  }
  return out;
}

export function makeCanvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, x: c.getContext('2d') };
}

export function resetCtx(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

// CSS-style cubic-bezier easing.
export function bezierEase(x1, y1, x2, y2, x) {
  const bx = s => 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s * s * x2 + s ** 3;
  const by = s => 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s * s * y2 + s ** 3;
  let lo = 0, hi = 1, s = x;
  for (let i = 0; i < 30; i++) {
    s = (lo + hi) / 2;
    if (bx(s) < x) lo = s; else hi = s;
  }
  return by(s);
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
}

// Text laid out around a circle (rotating badge).
export function badge(ctx, cx, cy, r, text, rot, font, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const n = text.length;
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.rotate((i / n) * TAU);
    ctx.fillText(text[i], 0, -r);
    ctx.restore();
  }
  ctx.restore();
}
