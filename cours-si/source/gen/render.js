// Render each HTML figure's <svg id="fig"> to a PNG at 2x.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const dir = __dirname;
  const outDir = path.join(dir, '..', 'img');
  require('fs').mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const page = await browser.newPage({ deviceScaleFactor: 2.5 });
  for (const name of process.argv.slice(2)) {
    await page.goto('file://' + path.join(dir, name + '.html'));
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#fig').screenshot({ path: path.join(outDir, name + '.png') });
    console.log('ok', name);
  }
  await browser.close();
})();
