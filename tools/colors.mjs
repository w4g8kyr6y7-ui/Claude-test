// Conversions indicatives : CMJN naïf et Pantone (Solid Coated) le plus proche.
import { hexToRgb } from './logo.mjs';

// Équivalents sRGB publiés des teintes Pantone Solid Coated les plus proches
// des bleus, rouges et teintes claires utilisés par les propositions.
const PANTONE = {
  '281 C': '#00205B', '282 C': '#041E42', '2767 C': '#13294B', '2768 C': '#071D49',
  '289 C': '#0C2340', '288 C': '#002D72', '287 C': '#003087', '286 C': '#0033A0',
  '2945 C': '#004C97', '2935 C': '#0057B8', '293 C': '#003DA5', '294 C': '#002F6C',
  '300 C': '#005EB8', '301 C': '#004B87', '7686 C': '#1D4F91', '7687 C': '#1D428A',
  '2728 C': '#0047BB', '285 C': '#0072CE', '2925 C': '#009CDE', '299 C': '#00A3E0',
  '7461 C': '#0082BA', '3005 C': '#0077C8', '279 C': '#418FDE', '2717 C': '#A7C6ED',
  '277 C': '#ABCAE9', '545 C': '#C6DAE7', '657 C': '#C8D8EB', '2706 C': '#CBD3EB',
  '186 C': '#C8102E', '185 C': '#E4002B', '1795 C': '#D22630', '1797 C': '#CB333B',
  '485 C': '#DA291C', '199 C': '#D50032', '200 C': '#BA0C2F', '201 C': '#9D2235',
  '202 C': '#862633', '7621 C': '#AB2328', '7427 C': '#97233F', '187 C': '#A6192E',
  '1788 C': '#EE2737', '032 C': '#EF3340', '7620 C': '#B7312C', '193 C': '#BF0D3E',
  '7419 C': '#B04A5A', '183 C': '#FCAFC0', '1767 C': '#F9B2B7', '7606 C': '#ECBAA8',
  '182 C': '#FABBCB',
};

function lab(hex) {
  const c = hexToRgb(hex).map((v) => {
    v /= 255;
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
  });
  const xyz = [
    (0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2]) / 0.95047,
    0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2],
    (0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2]) / 1.08883,
  ].map((v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
}

export function pantoneMatch(hex) {
  const l = lab(hex);
  let best = null, bestD = Infinity;
  for (const [name, h] of Object.entries(PANTONE)) {
    const m = lab(h);
    const d = Math.hypot(l[0] - m[0], l[1] - m[1], l[2] - m[2]);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

export function cmyk(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((v) => Math.round(v * 100));
}
