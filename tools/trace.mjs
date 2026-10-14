// Trace les masques produits par vectorize.py et assemble le symbole en SVG.
// Usage : node tools/trace.mjs logos/01 [logos/02 ...]
import fs from 'node:fs';
import path from 'node:path';
import potrace from 'potrace';

function traceMask(file) {
  return new Promise((resolve, reject) => {
    const p = new potrace.Potrace();
    p.setParameters({ turdSize: 60, alphaMax: 1.1, optCurve: true, optTolerance: 0.4, threshold: 128 });
    p.loadImage(file, (err) => {
      if (err) return reject(err);
      const m = p.getPathTag().match(/ d="([^"]+)"/);
      resolve(m ? m[1] : '');
    });
  });
}

// Arrondit les coordonnées pour alléger le fichier.
const compact = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 10) / 10));

export async function traceSymbol(folder) {
  const build = path.join(folder, 'build');
  const meta = JSON.parse(fs.readFileSync(path.join(build, 'layers.json'), 'utf8'));
  const layers = [];
  for (const l of meta.layers) {
    layers.push({ key: l.key, d: compact(await traceMask(path.join(build, l.mask))) });
  }
  const out = { width: meta.width, height: meta.height, bbox: meta.bbox, layers };
  fs.writeFileSync(path.join(build, 'symbol.json'), JSON.stringify(out));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of process.argv.slice(2)) {
    const s = await traceSymbol(f);
    console.log(f, s.layers.map((l) => `${l.key}:${l.d.length}`).join(' '));
  }
}
