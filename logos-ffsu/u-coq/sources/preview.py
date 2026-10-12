# Usage: python3 preview.py <project_id>
# Writes out/ucoq/<id>-symbole.svg, -long.svg, -court.svg and a contact sheet out/ucoq/<id>-preview.png
import sys, os, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import C, OUT
from lockup import vertical, horizontal, svg
from playwright.sync_api import sync_playwright

pid = sys.argv[1]
mod = importlib.import_module(pid.replace('-', '_'))
files = {}
inner, W, H = vertical(mod, f'{pid}-long-'); files['long'] = svg(inner, W, H, title='Fédération Française du Sport Universitaire')
inner, W, H = horizontal(mod, f'{pid}-court-'); files['court'] = svg(inner, W, H)
files['symbole'] = svg(f'<g>{mod.sym(C, pid + "-symbole-")}</g>', 100, 100, pad=8)
for k, v in files.items():
    open(os.path.join(OUT, f'ffsu-ucoq-{pid}-{k}.svg'), 'w').write(v)
sym = files['symbole']
def sized(doc, w=None, h=None):
    if w: return doc.replace('<svg ', f'<svg width="{w}" height="{h or w}" ', 1)
    return doc.replace('<svg ', f'<svg style="height:{h}px;width:auto" ', 1)
small = ''.join(f'<div style="width:{s}px;height:{s}px">{sized(sym, s)}</div>' for s in (64, 32, 16))
html = ('<body style="margin:0;background:#fff;font:12px sans-serif;color:#555">'
        '<div style="display:flex;gap:28px;align-items:center;padding:16px">'
        f'<div style="width:360px;height:360px;border:1px solid #eee">{sized(sym, 360)}</div>'
        f'<div style="height:420px">{sized(files["long"], h=420)}</div>'
        '<div style="display:flex;flex-direction:column;gap:20px">'
        f'<div style="height:110px">{sized(files["court"], h=110)}</div>'
        f'<div style="display:flex;gap:14px;align-items:flex-end">{small}</div></div></div></body>')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = b.new_page(viewport={'width': 1300, 'height': 460})
    pg.set_content(html)
    png = os.path.join(OUT, f'{pid}-preview.png')
    pg.screenshot(path=png)
    b.close()
print(png)
