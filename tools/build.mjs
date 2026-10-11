// Génère, pour chaque logo, les fichiers SVG et la planche de présentation A3 (PDF + PNG).
// Usage : node tools/build.mjs [logos/01 logos/02 ...]   (par défaut : tous les dossiers de logos/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  loadLogo, logoSvg, logoBox, protectionUnit, variantColors, hexToRgb, mix,
} from './logo.mjs';
import { pantoneMatch, cmyk } from './colors.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'planches');
const PNG_DPI = 200;

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const fontFace = (w) => `@font-face{font-family:Montserrat;font-weight:${w};src:url(data:font/woff2;base64,${
  fs.readFileSync(path.join(ROOT, `assets/fonts/montserrat-latin-${w}-normal.woff2`)).toString('base64')}) format('woff2');}`;
const fill = (svg) => svg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ');

// ---------- fichiers SVG livrables ----------
function writeSvgs(logo) {
  const dir = path.join(logo.folder, 'svg');
  fs.mkdirSync(dir, { recursive: true });
  const name = `FFSU ${logo.cfg.id} ${logo.cfg.name}`;
  const files = {
    'logo-couleur.svg': logoSvg(logo, { title: name }),
    'logo-monochrome.svg': logoSvg(logo, { variant: 'mono', title: `${name} (monochrome)` }),
    'logo-negatif.svg': logoSvg(logo, { variant: 'negative', title: `${name} (négatif)` }),
    'logo-negatif-sur-fond.svg': logoSvg(logo, {
      variant: 'negative', pad: protectionUnit(logo), bg: negativeBg(logo), title: `${name} (négatif sur fond)`,
    }),
    'logo-noir.svg': logoSvg(logo, { variant: 'black', title: `${name} (noir)` }),
    'symbole-couleur.svg': logoSvg(logo, { symbolOnly: true, title: `${name} (symbole)` }),
    'symbole-monochrome.svg': logoSvg(logo, { symbolOnly: true, variant: 'mono', title: `${name} (symbole monochrome)` }),
  };
  for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), s + '\n');
  return Object.keys(files);
}

const negativeBg = (logo) => (logo.cfg.negativeBg ? logo.pal[logo.cfg.negativeBg] : logo.ink);

// ---------- blocs de la planche ----------
function protectionSvg(logo) {
  const X = protectionUnit(logo);
  const b = logoBox(logo);
  const m = X * 1.9;
  const vb = [b.x1 - m, b.y1 - m, b.x2 - b.x1 + 2 * m, b.y2 - b.y1 + 2 * m];
  const inner = logoSvg(logo).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const sw = vb[2] / 260;
  const xBox = (x, y) => `<rect x="${x}" y="${y}" width="${X}" height="${X}" fill="#E8344A" fill-opacity=".14" stroke="#E8344A" stroke-width="${sw}"/>`
    + `<text x="${x + X / 2}" y="${y + X * 0.68}" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="${X * 0.55}" fill="#C21F33">X</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">
    <rect x="${b.x1 - X}" y="${b.y1 - X}" width="${b.x2 - b.x1 + 2 * X}" height="${b.y2 - b.y1 + 2 * X}" fill="#E8344A" fill-opacity=".05" stroke="#E8344A" stroke-width="${sw}" stroke-dasharray="${sw * 5} ${sw * 4}"/>
    <rect x="${b.x1}" y="${b.y1}" width="${b.x2 - b.x1}" height="${b.y2 - b.y1}" fill="#fff" stroke="#9AA3B2" stroke-width="${sw * 0.7}"/>
    ${inner}
    ${xBox(b.x1 - X, b.y1 - X)}${xBox(b.x2, b.y1 - X)}${xBox(b.x1 - X, b.y2)}${xBox(b.x2, b.y2)}
  </svg>`;
}

function paletteHtml(logo) {
  if (logo.cfg.palette.length > 6) {
    // Palette étendue : fiches compactes sur trois colonnes.
    return logo.cfg.palette.map((p) => {
      const [r, g, b] = hexToRgb(p.hex);
      return `<div class="swatch-c" title="${p.role}"><div class="chip" style="background:${p.hex}"></div><div style="min-width:0">
        <div class="sw-name">${p.name}</div>
        <div class="sw-line">${p.hex.toUpperCase()} · ${r} ${g} ${b}</div>
        <div class="sw-line">${cmyk(p.hex).join(' ')} · ≈ ${pantoneMatch(p.hex)}</div></div></div>`;
    }).join('');
  }
  return logo.cfg.palette.map((p) => {
    const [r, g, b] = hexToRgb(p.hex);
    const light = p.hex.toUpperCase() === '#FFFFFF';
    return `<div class="swatch">
      <div class="chip${light ? ' chip-light' : ''}" style="background:${p.hex}"></div>
      <div class="sw-name">${p.name}</div>
      <div class="sw-role">${p.role}</div>
      <dl><dt>HEX</dt><dd>${p.hex.toUpperCase()}</dd>
      <dt>RVB</dt><dd>${r} ${g} ${b}</dd>
      <dt>CMJN</dt><dd>${cmyk(p.hex).join(' ')}</dd>
      <dt>PMS</dt><dd>${light ? '—' : '≈ ' + pantoneMatch(p.hex)}</dd></dl>
    </div>`;
  }).join('');
}

function typographyHtml(logo) {
  const weights = [...new Set(logo.cfg.wordmark.items.map((i) => i.weight))].sort();
  const label = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' };
  const usage = weights.map((w) => {
    const its = logo.cfg.wordmark.items.filter((i) => i.weight === w);
    const what = its.some((i) => i.text === 'FFSU') ? 'sigle « FFSU »' : 'nom développé';
    return `${label[w]} — ${what}${its.length > 1 && what === 'sigle « FFSU »' ? ' et nom' : ''}`;
  });
  return `<div class="typo">
    <div class="typo-aa" style="color:${logo.ink}">Aa</div>
    <div>
      <div class="typo-name">Montserrat</div>
      <div class="typo-meta">Google Fonts · licence libre OFL</div>
      <div class="typo-weights">${weights.map((w) => `<span style="font-weight:${w}">${label[w]}</span>`).join('')}</div>
    </div>
  </div>
  <div class="typo-glyphs" style="font-weight:${weights[weights.length - 1]}">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 ÉÈÇÀ &amp; ! ?</div>
  <ul class="typo-usage">${usage.map((u) => `<li>${u}</li>`).join('')}</ul>`;
}

// ---------- mises en situation ----------
// Cadre commun : fond plein, illustration (dessinée en 360×250) réduite à 90 %, légende.
function frame(bg, art, label, floor = null) {
  return `<svg viewBox="0 0 360 224" class="mock"><rect width="360" height="224" fill="${bg}"/>`
    + (floor ? `<rect y="176" width="360" height="48" fill="${floor}"/>` : '')
    + `<g transform="translate(18 0) scale(.9)">${art}</g><text x="14" y="214" class="mock-label">${label}</text></svg>`;
}
function inner(svg) {
  const vb = svg.match(/viewBox="([^"]+)"/)[1];
  return { vb, body: svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') };
}
// Place un SVG de logo dans un rectangle (x, y, w, h), centré.
function place(svg, x, y, w, h) {
  const { vb, body } = inner(svg);
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}

function mockJersey(logo) {
  const c = variantColors(logo, 'color');
  const navy = logo.ink;
  const red = logo.pal.red || logo.pal.crimson || '#C8102E';
  const sym = logoSvg(logo, { symbolOnly: true });
  return frame('#E9EDF3', `
    <g transform="translate(70 18)">
      <path d="M70 6 L102 0 Q110 18 128 18 Q146 18 154 0 L186 6 L232 36 L214 84 L190 74 L190 222 Q128 232 66 222 L66 74 L42 84 L24 36 Z" fill="#fff" stroke="#CBD2DC" stroke-width="1.5"/>
      <path d="M102 0 Q110 18 128 18 Q146 18 154 0 L146 -1 Q139 11 128 11 Q117 11 110 -1 Z" fill="${navy}"/>
      <path d="M24 36 L42 84 L48 81 L30 33 Z" fill="${navy}"/><path d="M232 36 L214 84 L208 81 L226 33 Z" fill="${navy}"/>
      <rect x="66" y="208" width="124" height="5" fill="${navy}"/><rect x="66" y="213" width="124" height="3" fill="${red}"/>
      ${place(sym, 136, 52, 40, 46)}
      <text x="128" y="150" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="40" fill="${navy}">10</text>
    </g>`, 'Maillot');
}

function mockCard(logo) {
  const navy = logo.ink;
  const red = logo.pal.red || logo.pal.crimson;
  const blue = logo.pal.blue || navy;
  return frame('#F3EFE8', `
    <g transform="translate(40 34) rotate(-4 140 88)">
      <rect x="3" y="5" width="280" height="176" rx="12" fill="#000" opacity=".12"/>
      <rect width="280" height="176" rx="12" fill="#fff"/>
      <path d="M0 150 H280 V164 Q280 176 268 176 H12 Q0 176 0 164Z" fill="${navy}"/>
      <rect x="0" y="146" width="94" height="4" fill="${blue}"/><rect x="94" y="146" width="92" height="4" fill="#fff"/><rect x="186" y="146" width="94" height="4" fill="${red}"/>
      ${place(logoSvg(logo), 14, 14, 74, 96)}
      <text x="104" y="34" font-family="Montserrat" font-weight="800" font-size="13" fill="${navy}">LICENCE 2026 – 2027</text>
      <text x="104" y="50" font-family="Montserrat" font-weight="500" font-size="8.5" fill="#5B6577">Sport universitaire</text>
      <rect x="104" y="62" width="44" height="54" rx="4" fill="#DDE3EC"/>
      <circle cx="126" cy="80" r="10" fill="#B8C2D1"/><path d="M108 116 Q126 92 144 116Z" fill="#B8C2D1"/>
      <text x="158" y="74" font-family="Montserrat" font-weight="700" font-size="11" fill="#1B2333">Camille Martin</text>
      <text x="158" y="89" font-family="Montserrat" font-weight="500" font-size="8" fill="#5B6577">Université de Lyon</text>
      <text x="158" y="102" font-family="Montserrat" font-weight="500" font-size="8" fill="#5B6577">Athlétisme · Handball</text>
      <text x="158" y="118" font-family="Montserrat" font-weight="600" font-size="7.5" fill="#8A93A3">N° 26-069-004218</text>
      <text x="14" y="167" font-family="Montserrat" font-weight="600" font-size="7.5" fill="#fff" letter-spacing=".6">FÉDÉRATION FRANÇAISE DU SPORT UNIVERSITAIRE</text>
    </g>`, 'Carte de licence');
}

function mockSocial(logo) {
  const bg = negativeBg(logo);
  const neg = logoSvg(logo, { variant: 'negative' });
  const sym = logoSvg(logo, { symbolOnly: true });
  return frame('#E6EAF0', `
    <g transform="translate(105 12)">
      <rect width="150" height="226" rx="20" fill="#11161F"/>
      <rect x="6" y="6" width="138" height="214" rx="15" fill="#fff"/>
      <path d="M6 21 Q6 6 21 6 H129 Q144 6 144 21 V70 H6Z" fill="${bg}"/>
      ${place(neg, 40, 14, 70, 50)}
      <circle cx="40" cy="74" r="22" fill="#fff" stroke="#E3E7EE" stroke-width="2"/>
      ${place(sym, 25, 59, 30, 30)}
      <text x="16" y="112" font-family="Montserrat" font-weight="800" font-size="10" fill="#141A24">FFSU – Sport U</text>
      <text x="16" y="124" font-family="Montserrat" font-weight="500" font-size="6.5" fill="#6B7485">Compte officiel · Sport universitaire</text>
      <rect x="16" y="133" width="52" height="15" rx="7.5" fill="${bg}"/><text x="42" y="143.5" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="7" fill="#fff">Suivre</text>
      ${[0, 1, 2].map((i) => `<rect x="${12 + i * 43}" y="158" width="40" height="40" rx="4" fill="${mix(bg, '#FFFFFF', 0.15 + i * 0.3)}"/>`).join('')}
      ${place(sym, 20, 164, 24, 28)}
      ${[0, 1, 2].map((i) => `<rect x="${12 + i * 43}" y="201" width="40" height="12" rx="3" fill="#EEF1F5"/>`).join('')}
    </g>`, 'Réseaux sociaux');
}

function mockBanner(logo) {
  const bg = negativeBg(logo);
  const red = logo.pal.red || logo.pal.crimson;
  const blue = logo.pal.blue || logo.ink;
  return frame('#DCE1E8', `
    <g transform="translate(96 0)">
      <rect x="12" y="10" width="86" height="218" fill="${bg}"/>
      ${place(logoSvg(logo, { variant: 'negative' }), 22, 30, 66, 96)}
      <text x="55" y="150" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="7.6" fill="#fff">CHAMPIONNATS</text>
      <text x="55" y="160" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="7.6" fill="#fff">DE FRANCE U</text>
      <text x="55" y="174" text-anchor="middle" font-family="Montserrat" font-weight="500" font-size="6.5" fill="#fff" opacity=".8">2027</text>
      <rect x="12" y="206" width="29" height="4" fill="${mix(blue, '#FFFFFF', 0.25)}"/><rect x="41" y="206" width="28" height="4" fill="#fff"/><rect x="69" y="206" width="29" height="4" fill="${red}"/>
      <rect x="6" y="226" width="98" height="8" rx="2" fill="#8F98A6"/>
      <rect x="124" y="58" width="116" height="160" fill="#fff"/>
      ${place(logoSvg(logo), 140, 76, 84, 100)}
      <rect x="124" y="194" width="116" height="24" fill="${bg}"/>
      <text x="182" y="210" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="6.4" fill="#fff">ACCUEIL · ACCRÉDITATIONS</text>
      <rect x="178" y="218" width="8" height="16" fill="#8F98A6"/>
    </g>`, 'Kakémono &amp; signalétique', '#C9CFD8');
}

// ---------- planche ----------
function boardHtml(logo, total) {
  const { cfg } = logo;
  const negBg = negativeBg(logo);
  const red = logo.pal.red || logo.pal.crimson;
  const blue = logo.pal.blue || logo.ink;
  const X = protectionUnit(logo);
  const b = logoBox(logo);
  const ratio = (b.x2 - b.x1) / (b.y2 - b.y1);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Planche ${cfg.id} — ${cfg.name}</title>
<style>
${[400, 500, 600, 700, 800].map(fontFace).join('\n')}
@page { size: 420mm 297mm; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1587px; height: 1123px; }
body { font-family: Montserrat, Inter, sans-serif; color: #1B2333; background: #F2F4F7; overflow: hidden; position: relative; }
.flag { position: absolute; top: 0; left: 0; right: 0; height: 6px; display: flex; }
.flag i { flex: 1; } .flag i:nth-child(1) { background: ${blue}; } .flag i:nth-child(2) { background: #fff; } .flag i:nth-child(3) { background: ${red}; }
header { position: absolute; top: 6px; left: 0; right: 0; height: 92px; padding: 0 40px; display: flex; align-items: center; gap: 28px; background: #fff; border-bottom: 1px solid #E1E5EB; }
.num { font-weight: 800; font-size: 54px; color: ${logo.ink}; letter-spacing: -2px; line-height: 1; }
.titles { flex: 1; }
.kicker { font-size: 12px; font-weight: 700; letter-spacing: 2.4px; text-transform: uppercase; color: #6B7485; }
h1 { font-size: 34px; font-weight: 800; color: #141A24; letter-spacing: -.5px; margin-top: 2px; }
.tags { display: flex; gap: 8px; }
.tags span { font-size: 12px; font-weight: 600; padding: 7px 14px; border-radius: 999px; background: #EEF1F5; color: #3A4456; }
main { position: absolute; top: 114px; left: 40px; right: 40px; height: 640px; display: grid; grid-template-columns: 470px 1fr; gap: 16px; }
.card { background: #fff; border-radius: 14px; border: 1px solid #E1E5EB; padding: 18px 20px; position: relative; overflow: hidden; }
h2 { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #6B7485; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
h2::before { content: ""; width: 14px; height: 3px; border-radius: 2px; background: ${red}; }
.colA { display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 16px; min-height: 0; }
.hero { display: flex; flex-direction: column; }
.hero .logo { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 4px 30px 10px; }
.hero .logo svg { height: 100%; max-height: 390px; width: 100%; }
.concept p { font-size: 13.5px; line-height: 1.55; font-weight: 500; color: #333C4D; }
.colB { display: grid; grid-template-rows: 184px minmax(0, 1fr) 194px; gap: 16px; min-height: 0; }
.variants { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; height: 104px; }
.tile { height: 104px; min-width: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 12px; position: relative; border: 1px solid #E1E5EB; }
.tile > svg { width: 100%; height: 100%; }
.tile .cap { position: absolute; left: 0; right: 0; bottom: -21px; text-align: center; font-size: 11px; font-weight: 600; color: #4A5468; }
.appicons { gap: 14px; }
.appicon { border-radius: 22%; background: ${negBg}; display: flex; align-items: center; justify-content: center; }
.appicon svg { width: 74%; height: 74%; }
.row2 { display: grid; grid-template-columns: ${cfg.palette.length > 6 ? '1.9fr' : '1.55fr'} 1fr; gap: 16px; }
.palette { display: grid; grid-template-columns: repeat(${cfg.palette.length > 6 ? 3 : cfg.palette.length}, 1fr); gap: ${cfg.palette.length > 6 ? '12px 14px' : '10px 12px'}; }
.swatch-c { display: grid; grid-template-columns: 38px 1fr; gap: 9px; align-items: center; min-width: 0; }
.swatch-c .chip { height: 38px; margin: 0; }
.swatch-c .sw-role { font-weight: 500; display: inline; }
.sw-line { font-size: 9.5px; font-weight: 600; color: #333C4D; white-space: nowrap; line-height: 1.45; }
.palette-legend { font-size: 9.5px; color: #8A93A3; font-weight: 600; margin: -4px 0 10px; }
.swatch { min-width: 0; }
.chip { height: 52px; border-radius: 8px; margin-bottom: 6px; }
.chip-light { border: 1px solid #D5DAE2; }
.sw-name { font-size: 11.5px; font-weight: 700; color: #141A24; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sw-role { font-size: 9.5px; color: #6B7485; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
dl { display: grid; grid-template-columns: 36px 1fr; font-size: 9.5px; line-height: 1.4; }
dt { color: #8A93A3; font-weight: 600; } dd { font-weight: 600; color: #333C4D; white-space: nowrap; }
.note { position: absolute; right: 20px; top: 18px; font-size: 9.5px; color: #8A93A3; font-weight: 500; }
.typo { display: flex; gap: 16px; align-items: center; }
.typo-aa { font-size: 60px; font-weight: 800; line-height: 1; letter-spacing: -2px; }
.typo-name { font-size: 22px; font-weight: 800; }
.typo-meta { font-size: 11px; color: #6B7485; font-weight: 500; margin-bottom: 6px; }
.typo-weights { display: flex; gap: 10px; font-size: 12px; color: #333C4D; flex-wrap: wrap; }
.typo-glyphs { margin-top: 10px; font-size: 12px; line-height: 1.45; letter-spacing: .5px; color: #333C4D; }
.typo-usage { margin-top: 8px; font-size: 10.5px; color: #6B7485; list-style: none; font-weight: 500; }
.typo-usage li::before { content: "› "; color: ${red}; font-weight: 800; }
.row3 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.protect { display: grid; grid-template-columns: 1fr 200px; gap: 14px; align-items: center; height: 136px; }
.protect > svg { height: 136px; width: 100%; }
.legend { font-size: 11px; line-height: 1.5; color: #333C4D; font-weight: 500; }
.legend b { color: #C21F33; }
.sizes { display: flex; align-items: flex-end; justify-content: space-around; height: 136px; padding-top: 4px; }
.size { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.size .box { display: flex; align-items: flex-end; }
.size span { font-size: 10.5px; font-weight: 600; color: #4A5468; text-align: center; line-height: 1.35; }
.size small { display: block; font-weight: 500; color: #8A93A3; font-size: 9.5px; }
.mocks { position: absolute; left: 40px; right: 40px; top: 770px; }
.mockrow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.mock { width: 100%; display: block; border-radius: 10px; }
.mock-label { font-family: Montserrat; font-weight: 700; font-size: 11px; fill: #3A4456; letter-spacing: .5px; }
footer { position: absolute; left: 40px; right: 40px; bottom: 16px; display: flex; justify-content: space-between; font-size: 10.5px; color: #8A93A3; font-weight: 500; }
</style></head><body>
<div class="flag"><i></i><i></i><i></i></div>
<header>
  <div class="num">${cfg.id}</div>
  <div class="titles"><div class="kicker">Concours · Nouveau logo FFSU — Proposition ${cfg.id}</div><h1>${cfg.name}</h1></div>
  <div class="tags">${cfg.keywords.map((k) => `<span>${k}</span>`).join('')}</div>
</header>
<main>
  <div class="colA">
    <section class="card hero"><h2>Logo principal</h2><div class="logo">${fill(logoSvg(logo))}</div></section>
    <section class="card concept"><h2>Concept</h2><p>${cfg.concept}</p></section>
  </div>
  <div class="colB">
    <section class="card"><h2>Déclinaisons</h2>
      <div class="variants">
        <div class="tile" style="background:#fff">${fill(logoSvg(logo, { variant: 'mono' }))}<div class="cap">Monochrome</div></div>
        <div class="tile" style="background:${negBg};border-color:${negBg}">${fill(logoSvg(logo, { variant: 'negative' }))}<div class="cap">Négatif</div></div>
        <div class="tile" style="background:#fff">${fill(logoSvg(logo, { symbolOnly: true }))}<div class="cap">Symbole seul</div></div>
        <div class="tile appicons" style="background:#F6F7F9">
          <div class="appicon" style="width:72px;height:72px">${fill(logoSvg(logo, { symbolOnly: true, variant: 'negative' }))}</div>
          <div class="appicon" style="width:44px;height:44px;background:#fff;border:1px solid #E1E5EB">${fill(logoSvg(logo, { symbolOnly: true }))}</div>
          <div class="appicon" style="width:24px;height:24px">${fill(logoSvg(logo, { symbolOnly: true, variant: 'negative' }))}</div>
          <div class="cap">Icône d'application</div></div>
      </div>
    </section>
    <div class="row2">
      <section class="card"><h2>Palette de couleurs</h2><div class="note">CMJN et Pantone indicatifs — à valider sur nuancier</div>${cfg.palette.length > 6 ? '<div class="palette-legend">HEX · RVB  /  CMJN · Pantone</div>' : ''}<div class="palette">${paletteHtml(logo)}</div></section>
      <section class="card"><h2>Typographie</h2>${typographyHtml(logo)}</section>
    </div>
    <div class="row3">
      <section class="card"><h2>Zone de protection</h2>
        <div class="protect">${protectionSvg(logo)}
          <div class="legend">Aucun élément ne doit pénétrer la zone de protection.<br><br><b>X</b> = hauteur de capitale ${cfg.wordmark.items[0].text === 'FFSU' ? 'du sigle « FFSU »' : 'de la première ligne'}.<br>Marge minimale : <b>1 X</b> sur chaque côté.</div>
        </div>
      </section>
      <section class="card"><h2>Tailles minimales</h2>
        <div class="sizes">
          <div class="size"><div class="box" style="height:76px">${logoSvg(logo).replace('<svg ', `<svg style="height:76px;width:${Math.round(76 * ratio)}px" `)}</div><span>Logo complet<small>Print 25 mm · Écran 120 px</small></span></div>
          <div class="size"><div class="box" style="height:48px">${logoSvg(logo).replace('<svg ', `<svg style="height:48px;width:${Math.round(48 * ratio)}px" `)}</div><span>Réduction<small>Texte encore lisible</small></span></div>
          <div class="size"><div class="box" style="height:32px">${logoSvg(logo, { symbolOnly: true }).replace('<svg ', '<svg style="height:32px;width:36px" preserveAspectRatio="xMidYMid meet" ')}</div><span>Symbole seul<small>Print 8 mm · Écran 32 px</small></span></div>
          <div class="size"><div class="box" style="height:16px">${logoSvg(logo, { symbolOnly: true }).replace('<svg ', '<svg style="height:16px;width:16px" preserveAspectRatio="xMidYMid meet" ')}</div><span>Favicon<small>16 px</small></span></div>
        </div>
      </section>
    </div>
  </div>
</main>
<section class="card mocks"><h2>Mises en situation</h2>
  <div class="mockrow">${mockJersey(logo)}${mockCard(logo)}${mockSocial(logo)}${mockBanner(logo)}</div>
</section>
<footer><span>Fédération Française du Sport Universitaire · Concours logo · Planche ${cfg.id}${total ? ` / ${String(total).padStart(2, '0')}` : ''}</span><span>Logo vectoriel · Montserrat (OFL) · Format A3 paysage</span></footer>
</body></html>`;
}

async function main() {
  const args = process.argv.slice(2);
  const folders = args.length ? args : fs.readdirSync(path.join(ROOT, 'logos'))
    .filter((d) => fs.existsSync(path.join(ROOT, 'logos', d, 'logo.json'))).sort().map((d) => path.join('logos', d));
  const total = fs.readdirSync(path.join(ROOT, 'logos')).filter((d) => fs.existsSync(path.join(ROOT, 'logos', d, 'logo.json'))).length;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1587, height: 1123 }, deviceScaleFactor: PNG_DPI / 96 });
  for (const f of folders) {
    const logo = loadLogo(path.resolve(ROOT, f));
    const svgs = writeSvgs(logo);
    const base = `planche-${logo.cfg.id}-${slug(logo.cfg.name)}`;
    const html = boardHtml(logo, total);
    fs.writeFileSync(path.join(logo.folder, 'build', 'planche.html'), html);
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, `${base}.png`) });
    await page.pdf({ path: path.join(OUT, `${base}.pdf`), width: '420mm', height: '297mm', printBackground: true, pageRanges: '1' });
    console.log(`${f} → planches/${base}.{pdf,png} + ${svgs.length} SVG`);
  }
  await browser.close();
}

main();
