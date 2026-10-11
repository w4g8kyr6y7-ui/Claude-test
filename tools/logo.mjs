// Composition des logos en SVG : symbole vectorisé + texte vectorisé (Montserrat).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const { parse } = opentype;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonts = {};

export function font(weight) {
  if (!fonts[weight]) {
    const buf = fs.readFileSync(path.join(ROOT, `assets/fonts/montserrat-latin-${weight}-normal.woff`));
    fonts[weight] = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return fonts[weight];
}

// Sérialise un tracé opentype (son toPathData produit parfois des NaN).
const num = (v) => String(Math.round(v * 100) / 100);
function pathData(p) {
  return p.commands.map((c) => {
    switch (c.type) {
      case 'M': case 'L': return `${c.type}${num(c.x)} ${num(c.y)}`;
      case 'Q': return `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`;
      case 'C': return `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`;
      default: return 'Z';
    }
  }).join('');
}

// Construit le tracé d'une ligne de texte avec approche (tracking) et crénage.
function layout(text, weight, size, tracking) {
  const f = font(weight);
  const glyphs = f.stringToGlyphs(text);
  const scale = size / f.unitsPerEm;
  let x = 0;
  const parts = [];
  glyphs.forEach((g, i) => {
    parts.push(g.getPath(x, 0, size));
    x += g.advanceWidth * scale + tracking * size;
    if (i < glyphs.length - 1) x += f.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const p of parts) {
    const b = p.getBoundingBox();
    if (b.x1 === b.x2) continue;
    x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1);
    x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2);
  }
  return { parts, box: { x1, y1, x2, y2 } };
}

// Ligne de texte dont la largeur d'encre vaut `width`, centrée sur cx, posée sur baseline.
export function textLine({ text, weight, width, cx, baseline, tracking = 0 }) {
  const probe = layout(text, weight, 100, tracking);
  const size = (100 * width) / (probe.box.x2 - probe.box.x1);
  const { parts, box } = layout(text, weight, size, tracking);
  const dx = cx - (box.x1 + box.x2) / 2;
  const d = parts.map(pathData).join('');
  const capHeight = (font(weight).tables.os2.sCapHeight / font(weight).unitsPerEm) * size;
  return {
    d, dx, dy: baseline, size, capHeight,
    box: { x1: box.x1 + dx, x2: box.x2 + dx, y1: box.y1 + baseline, y2: box.y2 + baseline },
  };
}

// ---------- couleurs ----------
export const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rgbToHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
export const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));
export const luminance = (h) => {
  const [r, g, b] = hexToRgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function loadLogo(folder) {
  const cfg = JSON.parse(fs.readFileSync(path.join(folder, 'logo.json'), 'utf8'));
  const symbol = JSON.parse(fs.readFileSync(path.join(folder, 'build/symbol.json'), 'utf8'));
  const pal = Object.fromEntries(cfg.palette.map((p) => [p.key, p.hex]));
  const wm = cfg.wordmark;
  const lines = (wm.items || []).map((it) => textLine({ ...it, cx: wm.cx }));
  const ink = pal[wm.color];
  return { cfg, symbol, pal, lines, ink, folder };
}

// Table de couleurs pour une variante : key -> hex.
export function variantColors(logo, variant) {
  const { cfg, pal, ink, symbol } = logo;
  const keys = [...new Set(symbol.layers.map((l) => l.key))];
  if (variant === 'color') return { ...pal, text: ink };
  const tints = cfg.monoTints;
  // Teintes ordonnées de la plus foncée à la plus claire.
  const ranked = [...keys].sort((a, b) => luminance(pal[a]) - luminance(pal[b]));
  const level = (k) => (ranked.length > 1 ? ranked.indexOf(k) / (ranked.length - 1) : 0);
  const out = {};
  if (variant === 'mono') {
    for (const k of keys) out[k] = tints ? mix(ink, '#FFFFFF', level(k) * 0.62) : ink;
    out.text = ink;
  } else if (variant === 'negative') {
    const bg = cfg.negativeBg ? pal[cfg.negativeBg] : ink;
    for (const k of keys) out[k] = tints ? mix('#FFFFFF', bg, level(k) * 0.55) : '#FFFFFF';
    out.text = '#FFFFFF';
  } else if (variant === 'black') {
    for (const k of keys) out[k] = tints ? mix('#111111', '#FFFFFF', level(k) * 0.62) : '#111111';
    out.text = '#111111';
  }
  return out;
}

let gradientCount = 0;

function symbolGroup(logo, colors) {
  const [x0, y0] = logo.cfg.crop;
  const s = 1 / logo.symbol.width * (logo.cfg.crop[2] - logo.cfg.crop[0]);
  const paths = logo.symbol.layers
    .map((l) => `<path fill="${colors[l.key]}" fill-rule="evenodd" d="${l.d}"/>`).join('');
  // Éléments dessinés à la main (unités source), ex. trait de vitesse en dégradé.
  const extras = (logo.cfg.extras || []).map((e, i) => {
    if (!e.fade) return `<path fill="${colors[e.key]}" d="${e.d}"/>`;
    const id = `fade-${logo.cfg.id}-${i}-${++gradientCount}`;
    return `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">`
      + `<stop offset="0" stop-color="${colors[e.key]}" stop-opacity="${e.fade[0]}"/>`
      + `<stop offset="1" stop-color="${colors[e.key]}" stop-opacity="${e.fade[1]}"/></linearGradient>`
      + `<path fill="url(#${id})" d="${e.d}"/>`;
  }).join('');
  return `<g transform="translate(${x0} ${y0}) scale(${s.toFixed(5)})">${paths}</g>${extras}`;
}

export function symbolBox(logo) {
  const b = logo.symbol.bbox;
  const box = { x1: b[0], y1: b[1], x2: b[2], y2: b[3] };
  for (const e of logo.cfg.extras || []) {
    const n = e.d.match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 0; i < n.length; i += 2) {
      box.x1 = Math.min(box.x1, n[i]); box.x2 = Math.max(box.x2, n[i]);
      box.y1 = Math.min(box.y1, n[i + 1]); box.y2 = Math.max(box.y2, n[i + 1]);
    }
  }
  return box;
}

// Boîte englobante du logo complet (unités de l'image source).
export function logoBox(logo, { symbolOnly = false } = {}) {
  const b = { ...symbolBox(logo) };
  if (!symbolOnly) {
    for (const l of logo.lines) {
      b.x1 = Math.min(b.x1, l.box.x1); b.x2 = Math.max(b.x2, l.box.x2);
      b.y1 = Math.min(b.y1, l.box.y1); b.y2 = Math.max(b.y2, l.box.y2);
    }
  }
  return b;
}

// Unité X de la zone de protection : hauteur de capitale de la première ligne.
export const protectionUnit = (logo) => logo.lines[0].capHeight;

/** Renvoie un SVG autonome. opts: { variant, symbolOnly, pad, bg } */
export function logoSvg(logo, { variant = 'color', symbolOnly = false, pad = 0, bg = null, title } = {}) {
  const colors = variantColors(logo, variant);
  const b = logoBox(logo, { symbolOnly });
  const vb = [b.x1 - pad, b.y1 - pad, b.x2 - b.x1 + 2 * pad, b.y2 - b.y1 + 2 * pad].map((v) => +v.toFixed(2));
  const text = symbolOnly ? '' : logo.lines
    .map((l) => `<path fill="${colors.text}" transform="translate(${l.dx.toFixed(2)} ${l.dy.toFixed(2)})" d="${l.d}"/>`).join('');
  const bgRect = bg ? `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${bg}"/>` : '';
  const t = title ? `<title>${title}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">${t}${bgRect}${symbolGroup(logo, colors)}${text}</svg>`;
}
