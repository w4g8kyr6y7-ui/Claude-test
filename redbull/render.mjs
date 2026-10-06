// Headless frame renderer.
//   node render.mjs stills 0.5 2.2 6.8      -> build/stills/t_<time>.png
//   node render.mjs video [--workers 3]      -> build/showreel_silent.mp4
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const BUILD = path.join(ROOT, 'build');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wav': 'audio/wav' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, () => res(srv));
  });
}

async function openPage(port) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(`http://localhost:${port}/index.html?render`);
  await page.waitForFunction(() => window.SR);
  const meta = await page.evaluate(() => window.SR.init());
  return { browser, page, meta };
}

async function shot(page, t) {
  await page.evaluate(tt => window.SR.frame(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

async function stills(port, times) {
  const dir = path.join(BUILD, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  const { browser, page } = await openPage(port);
  for (const t of times) {
    const t0 = Date.now();
    const buf = await shot(page, t);
    const f = path.join(dir, `t_${t.toFixed(3)}.png`);
    fs.writeFileSync(f, buf);
    console.log(f, `${Date.now() - t0}ms`);
  }
  await browser.close();
}

function encodeRange(page, fps, from, to, out) {
  return new Promise(async (resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '8', '-pix_fmt', 'yuv444p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    ff.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    for (let f = from; f < to; f++) {
      const buf = await shot(page, f / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
  });
}

// Chunks are pulled from a shared queue so the slow shader scenes spread across workers.
async function video(port, workers, size = 30) {
  fs.mkdirSync(BUILD, { recursive: true });
  const FPS = 60, total = FPS * 15;
  const chunks = [];
  for (let f = 0; f < total; f += size) chunks.push([f, Math.min(total, f + size)]);
  const outs = chunks.map((_, i) => path.join(BUILD, `part_${String(i).padStart(3, '0')}.mp4`));
  let next = 0;
  const t0 = Date.now();
  const worker = async id => {
    const { browser, page } = await openPage(port);
    while (next < chunks.length) {
      const i = next++;
      const [from, to] = chunks[i];
      const c0 = Date.now();
      await encodeRange(page, FPS, from, to, outs[i]);
      console.log(`w${id} frames ${from}-${to - 1}  ${((Date.now() - c0) / (to - from)).toFixed(0)}ms/f  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    await browser.close();
  };
  await Promise.all(Array.from({ length: workers }, (_, w) => worker(w)));
  const list = path.join(BUILD, 'parts.txt');
  fs.writeFileSync(list, outs.map(p => `file '${p}'`).join('\n'));
  await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(BUILD, 'showreel_silent.mp4')], { stdio: 'inherit' }).on('close', r));
  outs.forEach(p => fs.unlinkSync(p));
  fs.unlinkSync(list);
  console.log('wrote', path.join(BUILD, 'showreel_silent.mp4'), `in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

const [mode, ...rest] = process.argv.slice(2);
const srv = await serve();
const port = srv.address().port;
if (mode === 'stills') await stills(port, rest.map(Number));
else if (mode === 'video') {
  const wi = rest.indexOf('--workers');
  await video(port, wi >= 0 ? Number(rest[wi + 1]) : 4);
}
srv.close();
