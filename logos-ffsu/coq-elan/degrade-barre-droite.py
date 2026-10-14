# Replace the hard red/blue split of the U's right bar with a smooth gradient (red at the bottom -> blue at the top),
# on every coloured logo of the board. Usage: python3 -I grad.py board.png out.png
import sys, json
import numpy as np
from PIL import Image

SRC, DST = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
a = im.astype(int); R, G, B = a[..., 0], a[..., 1], a[..., 2]
red = (R > 140) & (G < 110) & (B < 120) & (R > G + 60)
blue = (B > 110) & (B > R + 50) & (R < 120)
rb = red | blue
# search regions (x0, y0, x1, y1): the symbol's bounding box is computed inside each
REG = {'main': (190, 200, 530, 525), 'symb': (1410, 200, 1545, 340), 'icon': (1775, 228, 1846, 305),
       'tm_complet': (1395, 775, 1488, 856), 'zone': (805, 790, 888, 875), 'tm_reduc': (1568, 810, 1640, 868),
       'tm_symb': (1727, 830, 1798, 910), 'carte': (620, 1068, 718, 1156), 'phone': (1178, 1100, 1224, 1146),
       'maillot': (318, 1092, 393, 1172), 'kakemono': (1765, 1095, 1866, 1187)}
def _lin(c): c = c / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def _gam(c): c = np.clip(c, 0, 1); return 255 * np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)
def to_oklch(rgb):
    r, g, b = _lin(np.asarray(rgb, float))
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b; m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s_ = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l, m, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s_)
    L = 0.2104542553*l + 0.7936177850*m - 0.0040720468*s_; A = 1.9779984951*l - 2.4285922050*m + 0.4505937099*s_
    Bb = 0.0259040371*l + 0.7827717662*m - 0.8086757660*s_
    return np.array([L, np.hypot(A, Bb), np.arctan2(Bb, A)])
def from_oklch(L, C, h):
    A, Bb = C * np.cos(h), C * np.sin(h)
    l = (L + 0.3963377774*A + 0.2158037573*Bb) ** 3; m = (L - 0.1055613458*A - 0.0638541728*Bb) ** 3
    s_ = (L - 0.0894841694*A - 1.2914855480*Bb) ** 3
    r = 4.0767416621*l - 3.3077115913*m + 0.2309699292*s_; g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s_
    b = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s_
    return np.array([_gam(r), _gam(g), _gam(b)])
def mix(cb, cr, t):
    # perceptual blend along the hue wheel (blue -> violet -> red), no muddy grey in the middle
    p, q = to_oklch(cb), to_oklch(cr)
    dh = (q[2] - p[2] + np.pi) % (2 * np.pi) - np.pi
    return from_oklch(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + dh * t)

inkness = 255 - im.min(-1)          # 0 on white, ~220 on full red or blue
report = {}
out = im.copy()

def ribbon_run(y, x0, x1):
    """Pixels of the rightmost ribbon on row y: from the rightmost ink pixel leftwards to the first valley."""
    v = inkness[y, x0:x1]
    idx = np.nonzero(v > 40)[0]
    if not len(idx): return None
    xr = idx[-1]; peak = 0; x = xr
    while x > 0:
        peak = max(peak, v[x])
        if peak > 120 and v[x] < 0.6 * peak and v[x - 1] >= v[x]:   # passed the ribbon and reached the valley
            break
        x -= 1
    return x0 + x, x0 + xr + 1

for k, (x0, y0, x1, y1) in REG.items():
    ys, xs = np.nonzero(rb[y0:y1, x0:x1])
    top, bot = y0 + ys.min(), y0 + ys.max() + 1
    lft, rgt = x0 + xs.min(), x0 + xs.max() + 1
    h = bot - top
    # transition row: first row (mid-height) where the rightmost ribbon turns red
    T = None
    for y in range(int(top + 0.25 * h), int(top + 0.75 * h)):
        run = ribbon_run(y, lft, rgt)
        if not run: continue
        seg = a[y, run[0]:run[1]]
        nr = ((seg[:, 0] > seg[:, 2] + 40)).sum(); nb = ((seg[:, 2] > seg[:, 0] + 40)).sum()
        if nr > nb and nr >= 1: T = y; break
    if T is None:
        report[k] = 'no transition found'; continue
    zt, zb = int(round(T - 0.20 * h)), int(round(T + 0.39 * h))
    # reference colours sampled from this logo just outside the zone (seamless joins)
    def sample(rows, want):
        px = []
        for y in rows:
            run = ribbon_run(y, lft, rgt)
            if not run: continue
            seg = im[y, run[0]:run[1]]; segv = inkness[y, run[0]:run[1]]
            sel = seg[segv > 0.85 * segv.max()]
            px += [p for p in sel if (p[2] > p[0] + 40 if want == 'b' else p[0] > p[2] + 40)]
        return np.median(np.array(px), 0) if len(px) else None
    cb = sample(range(zt - max(3, h // 25), zt), 'b'); cr = sample(range(zb, zb + max(3, h // 25)), 'r')
    if cb is None or cb.sum() < 220:
        sub = a[top:bot, lft:rgt].reshape(-1, 3)
        sel = sub[(sub[:, 2] > sub[:, 0] + 50) & (sub.sum(1) > 220) & ((255 - sub.min(1)) > 120)]
        cb = np.median(sel, 0).astype(float) if len(sel) else np.array([22, 82, 154.])
    if cr is None: cr = np.array([186, 34, 41.])
    vink = 255 - min(cb.min(), cr.min())
    n = 0
    for y in range(zt, zb):
        run = ribbon_run(y, lft, rgt)
        if not run: continue
        t = (y - zt) / (zb - zt)
        t = t * t * (3 - 2 * t)                          # smoothstep: soft start and end
        g = mix(cb, cr, t)
        xs_ = np.arange(run[0], run[1])
        orig = a[y, xs_]
        own = np.where((orig[:, 0] > orig[:, 2])[:, None], cr[None, :], cb[None, :])
        al = np.clip(inkness[y, xs_] / (255 - own.min(1)), 0, 1)
        core = np.zeros(len(xs_), bool)
        inner = np.nonzero(al > 0.5)[0]
        if len(inner) > 4: core[inner[0] + 1: inner[-1]] = True     # interior of the stroke: fully opaque
        al = np.where(core, 1.0, al)[:, None]
        bg = np.array([255., 255., 255.])
        out[y, xs_] = bg * (1 - al) + g * al
        n += len(xs_)
    report[k] = dict(symbol=(int(lft), int(top), int(rgt), int(bot)), T=int(T), zone=(zt, zb), px=n,
                     blue=[int(v) for v in cb], red=[int(v) for v in cr])
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(DST)
json.dump(report, open('grad_report.json', 'w'), indent=1)
for k, v in report.items(): print(k, v)
